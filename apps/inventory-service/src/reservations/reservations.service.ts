import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import {
  StockReservation,
  ReservationStatus,
} from './entities/stock-reservation.entity';
import { ReservationItem } from './entities/reservation-item.entity';
import {
  IdempotencyService,
  OutboxService,
  KAFKA_TOPICS,
  OrderCreatedPayload,
  InventoryReservedPayload,
  InventoryFailedPayload,
} from '@app/common';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Processes order.created event using pessimistic row locks (SELECT ... FOR UPDATE).
   * Ensures zero stock overshoot even under high concurrency.
   */
  async processOrderCreated(
    eventId: string,
    correlationId: string,
    payload: OrderCreatedPayload,
  ): Promise<void> {
    const { orderId, items } = payload;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Idempotency Check inside transaction
      const alreadyProcessed = await this.idempotencyService.isProcessed(
        eventId,
        queryRunner.manager,
      );
      if (alreadyProcessed) {
        await queryRunner.commitTransaction();
        return;
      }

      // Check if reservation already exists for this orderId
      const existingReservation = await queryRunner.manager.findOne(
        StockReservation,
        { where: { orderId } },
      );
      if (existingReservation) {
        this.logger.warn(
          `[RESERVATION] Order ${orderId} already has a reservation (${existingReservation.status}). Skipping.`,
        );
        await this.idempotencyService.markProcessed(
          eventId,
          KAFKA_TOPICS.ORDER_CREATED,
          queryRunner.manager,
        );
        await queryRunner.commitTransaction();
        return;
      }

      // Sort product IDs to prevent deadlocks when locking multiple rows
      const productIds = items.map((i) => i.productId).sort();

      // 2. Lock products with PESSIMISTIC_WRITE (SELECT ... FOR UPDATE)
      const lockedProducts = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id IN (:...ids)', { ids: productIds })
        .getMany();

      const productMap = new Map<string, Product>();
      lockedProducts.forEach((p) => productMap.set(p.id, p));

      // 3. Verify stock availability for all requested items
      let hasInsufficientStock = false;
      let failureReason = '';

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          hasInsufficientStock = true;
          failureReason = `Product '${item.productId}' does not exist`;
          break;
        }
        if (product.stockQuantity < item.quantity) {
          hasInsufficientStock = true;
          failureReason = `Insufficient stock for product '${product.name}' (SKU: ${product.sku}). Available: ${product.stockQuantity}, Requested: ${item.quantity}`;
          break;
        }
      }

      // 4. Branch: Insufficient Stock -> publish inventory.failed
      if (hasInsufficientStock) {
        this.logger.warn(
          `[STOCK RESERVATION FAILED] Order ${orderId}: ${failureReason}`,
        );

        // Record event as processed
        await this.idempotencyService.markProcessed(
          eventId,
          KAFKA_TOPICS.ORDER_CREATED,
          queryRunner.manager,
        );

        // Transactional outbox event: inventory.failed
        const failedPayload: InventoryFailedPayload = {
          orderId,
          reason: failureReason,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        };
        await this.outboxService.createOutboxEvent(
          KAFKA_TOPICS.INVENTORY_FAILED,
          orderId,
          KAFKA_TOPICS.INVENTORY_FAILED,
          failedPayload,
          correlationId,
          queryRunner.manager,
        );

        await queryRunner.commitTransaction();
        return;
      }

      // 5. Branch: Sufficient Stock -> Decrement stock & save reservation
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        product.stockQuantity -= item.quantity;
        await queryRunner.manager.save(product);
      }

      const reservation = queryRunner.manager.create(StockReservation, {
        orderId,
        status: ReservationStatus.RESERVED,
        items: items.map((i) =>
          queryRunner.manager.create(ReservationItem, {
            productId: i.productId,
            quantity: i.quantity,
          }),
        ),
      });
      const savedReservation = await queryRunner.manager.save(reservation);

      // Record event as processed
      await this.idempotencyService.markProcessed(
        eventId,
        KAFKA_TOPICS.ORDER_CREATED,
        queryRunner.manager,
      );

      // Transactional outbox event: inventory.reserved
      const reservedPayload: InventoryReservedPayload = {
        orderId,
        reservationId: savedReservation.id,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      };
      await this.outboxService.createOutboxEvent(
        KAFKA_TOPICS.INVENTORY_RESERVED,
        orderId,
        KAFKA_TOPICS.INVENTORY_RESERVED,
        reservedPayload,
        correlationId,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `[STOCK RESERVED] Order ${orderId} reserved successfully (Reservation ID: ${savedReservation.id})`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Releases reserved stock when an order is rejected or cancelled (compensating transaction).
   * Restores stock quantities and sets reservation status to RELEASED idempotently.
   */
  async releaseStock(
    eventId: string,
    topic: string,
    orderId: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const alreadyProcessed = await this.idempotencyService.isProcessed(
        eventId,
        queryRunner.manager,
      );
      if (alreadyProcessed) {
        await queryRunner.commitTransaction();
        return;
      }

      const reservation = await queryRunner.manager.findOne(StockReservation, {
        where: { orderId },
        relations: { items: true },
      });

      if (!reservation) {
        this.logger.log(
          `[STOCK RELEASE] No reservation found for order ${orderId}. Nothing to release.`,
        );
        await this.idempotencyService.markProcessed(
          eventId,
          topic,
          queryRunner.manager,
        );
        await queryRunner.commitTransaction();
        return;
      }

      if (reservation.status === ReservationStatus.RELEASED) {
        this.logger.log(
          `[STOCK RELEASE] Reservation for order ${orderId} was already RELEASED. Skipping.`,
        );
        await this.idempotencyService.markProcessed(
          eventId,
          topic,
          queryRunner.manager,
        );
        await queryRunner.commitTransaction();
        return;
      }

      // Lock products to restore stock
      const productIds = reservation.items.map((i) => i.productId).sort();
      const lockedProducts = await queryRunner.manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
        .where('product.id IN (:...ids)', { ids: productIds })
        .getMany();

      const productMap = new Map<string, Product>();
      lockedProducts.forEach((p) => productMap.set(p.id, p));

      for (const item of reservation.items) {
        const product = productMap.get(item.productId);
        if (product) {
          product.stockQuantity += item.quantity;
          await queryRunner.manager.save(product);
        }
      }

      reservation.status = ReservationStatus.RELEASED;
      await queryRunner.manager.save(reservation);

      await this.idempotencyService.markProcessed(
        eventId,
        topic,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `[STOCK RELEASED] Successfully released stock for order ${orderId} and updated reservation status to RELEASED`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
