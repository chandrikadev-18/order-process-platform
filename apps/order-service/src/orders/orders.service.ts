import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom, Observable } from 'rxjs';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import {
  IdempotencyService,
  OutboxService,
  KAFKA_TOPICS,
  OrderCreatedPayload,
  OrderConfirmedPayload,
  OrderRejectedPayload,
  OrderCancelledPayload,
  InventoryReservedPayload,
  InventoryFailedPayload,
} from '@app/common';

interface InventoryGrpcClient {
  getProducts(data: { ids: string[] }): Observable<{ products: any[] }>;
}

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  private inventoryClient!: InventoryGrpcClient;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @Inject('INVENTORY_PACKAGE')
    private readonly client: ClientGrpc,
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
    private readonly outboxService: OutboxService,
  ) {}

  onModuleInit() {
    this.inventoryClient =
      this.client.getService<InventoryGrpcClient>('InventoryService');
  }

  /**
   * Creates a new order:
   * 1. Validates items by querying Inventory gRPC GetProducts
   * 2. In ONE DB transaction:
   *    - Inserts Order (PENDING)
   *    - Inserts OrderItems
   *    - Inserts Outbox row for order.created
   */
  async createOrder(data: {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    correlationId?: string;
  }): Promise<Order> {
    const { userId, items, correlationId = '' } = data;

    if (!items || items.length === 0) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Order must contain at least one item',
      });
    }

    // 1. Validate items against Inventory gRPC service
    const productIds = items.map((i) => i.productId);
    let inventoryResponse: { products: any[] };
    try {
      inventoryResponse = await firstValueFrom(
        this.inventoryClient.getProducts({ ids: productIds }),
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to call Inventory gRPC GetProducts: ${err.message}`,
      );
      throw new RpcException({
        code: GrpcStatus.UNAVAILABLE,
        message: 'Inventory service is currently unavailable',
      });
    }

    const productMap = new Map<string, any>();
    (inventoryResponse?.products || []).forEach((p: any) =>
      productMap.set(p.id, p),
    );

    // Verify all products exist and calculate total amount
    let totalAmount = 0;
    const validatedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: `Quantity for product '${item.productId}' must be greater than zero`,
        });
      }
      const product = productMap.get(item.productId);
      if (!product) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: `Product with ID '${item.productId}' not found in inventory`,
        });
      }

      const unitPrice = parseFloat(product.price);
      totalAmount += unitPrice * item.quantity;
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      });
    }

    // 2. Atomic Database Transaction: Order + Items + Outbox Event
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = queryRunner.manager.create(Order, {
        userId,
        status: OrderStatus.PENDING,
        totalAmount,
      });
      const savedOrder = await queryRunner.manager.save(order);

      const orderItems = validatedItems.map((item) =>
        queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      );
      await queryRunner.manager.save(orderItems);
      savedOrder.items = orderItems;

      // Transactional Outbox Event for order.created
      const eventPayload: OrderCreatedPayload = {
        orderId: savedOrder.id,
        userId: savedOrder.userId,
        totalAmount: savedOrder.totalAmount,
        items: validatedItems,
      };

      await this.outboxService.createOutboxEvent(
        KAFKA_TOPICS.ORDER_CREATED,
        savedOrder.id,
        KAFKA_TOPICS.ORDER_CREATED,
        eventPayload,
        correlationId,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      this.logger.log(
        `[ORDER CREATED] Order ${savedOrder.id} created for user ${userId} in PENDING state (total: ${totalAmount})`,
      );

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrder(id: string, userId?: string): Promise<Order> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }
    const order = await this.orderRepo.findOne({
      where,
      relations: { items: true },
    });

    if (!order) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Order with ID '${id}' not found`,
      });
    }
    return order;
  }

  async listOrders(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
    const [orders, total] = await this.orderRepo.findAndCount({
      where: { userId },
      relations: { items: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { orders, total, page, limit };
  }

  async cancelOrder(id: string, userId?: string): Promise<Order> {
    const order = await this.getOrder(id, userId);

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REJECTED
    ) {
      throw new RpcException({
        code: GrpcStatus.FAILED_PRECONDITION,
        message: `Cannot cancel an order with status '${order.status}'`,
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = OrderStatus.CANCELLED;
      const updatedOrder = await queryRunner.manager.save(order);

      // Create outbox event for order.cancelled so inventory releases reserved stock
      const cancelPayload: OrderCancelledPayload = {
        orderId: order.id,
        userId: order.userId,
      };

      await this.outboxService.createOutboxEvent(
        KAFKA_TOPICS.ORDER_CANCELLED,
        order.id,
        KAFKA_TOPICS.ORDER_CANCELLED,
        cancelPayload,
        '',
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `[ORDER CANCELLED] Order ${id} cancelled by user ${userId}`,
      );
      return updatedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Consumes inventory.reserved -> Marks order as CONFIRMED -> Outbox order.confirmed
   */
  async processInventoryReserved(
    eventId: string,
    correlationId: string,
    payload: InventoryReservedPayload,
  ): Promise<void> {
    const { orderId } = payload;

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

      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(
          `Order ${orderId} not found when confirming reservation`,
        );
        await this.idempotencyService.markProcessed(
          eventId,
          KAFKA_TOPICS.INVENTORY_RESERVED,
          queryRunner.manager,
        );
        await queryRunner.commitTransaction();
        return;
      }

      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.CONFIRMED;
        await queryRunner.manager.save(order);

        // Transactional outbox event: order.confirmed
        const confirmedPayload: OrderConfirmedPayload = {
          orderId: order.id,
          userId: order.userId,
          totalAmount: order.totalAmount,
        };

        await this.outboxService.createOutboxEvent(
          KAFKA_TOPICS.ORDER_CONFIRMED,
          order.id,
          KAFKA_TOPICS.ORDER_CONFIRMED,
          confirmedPayload,
          correlationId,
          queryRunner.manager,
        );
      }

      await this.idempotencyService.markProcessed(
        eventId,
        KAFKA_TOPICS.INVENTORY_RESERVED,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `[ORDER CONFIRMED] Order ${orderId} updated to CONFIRMED`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Consumes inventory.failed -> Marks order as REJECTED -> Outbox order.rejected
   */
  async processInventoryFailed(
    eventId: string,
    correlationId: string,
    payload: InventoryFailedPayload,
  ): Promise<void> {
    const { orderId, reason } = payload;

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

      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(
          `Order ${orderId} not found when processing failed inventory`,
        );
        await this.idempotencyService.markProcessed(
          eventId,
          KAFKA_TOPICS.INVENTORY_FAILED,
          queryRunner.manager,
        );
        await queryRunner.commitTransaction();
        return;
      }

      if (order.status === OrderStatus.PENDING) {
        order.status = OrderStatus.REJECTED;
        await queryRunner.manager.save(order);

        // Transactional outbox event: order.rejected
        const rejectedPayload: OrderRejectedPayload = {
          orderId: order.id,
          userId: order.userId,
          reason,
        };

        await this.outboxService.createOutboxEvent(
          KAFKA_TOPICS.ORDER_REJECTED,
          order.id,
          KAFKA_TOPICS.ORDER_REJECTED,
          rejectedPayload,
          correlationId,
          queryRunner.manager,
        );
      }

      await this.idempotencyService.markProcessed(
        eventId,
        KAFKA_TOPICS.INVENTORY_FAILED,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `[ORDER REJECTED] Order ${orderId} updated to REJECTED (Reason: ${reason})`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
