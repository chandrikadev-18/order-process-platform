import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notification } from './entities/notification.entity';
import {
  IdempotencyService,
  KAFKA_TOPICS,
  OrderConfirmedPayload,
  OrderRejectedPayload,
} from '@app/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Consumes order.confirmed event, stores notification in DB, and simulates sending email.
   */
  async handleOrderConfirmed(
    eventId: string,
    correlationId: string,
    payload: OrderConfirmedPayload,
  ): Promise<void> {
    const { orderId, userId, totalAmount } = payload;

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

      const message = `Your order ${orderId} for $${totalAmount.toFixed(2)} has been confirmed!`;

      const notification = queryRunner.manager.create(Notification, {
        orderId,
        userId,
        type: 'ORDER_CONFIRMED',
        message,
      });
      await queryRunner.manager.save(notification);

      await this.idempotencyService.markProcessed(
        eventId,
        KAFKA_TOPICS.ORDER_CONFIRMED,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      // Simulate sending email by logging clearly
      this.logger.log(
        `[EMAIL DISPATCH] 📧 To User '${userId}': Order ${orderId} CONFIRMED! Total: $${totalAmount.toFixed(2)}. (Correlation: ${correlationId})`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Consumes order.rejected event, stores notification in DB, and simulates sending email.
   */
  async handleOrderRejected(
    eventId: string,
    correlationId: string,
    payload: OrderRejectedPayload,
  ): Promise<void> {
    const { orderId, userId, reason } = payload;

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

      const message = `Your order ${orderId} was rejected. Reason: ${reason}`;

      const notification = queryRunner.manager.create(Notification, {
        orderId,
        userId,
        type: 'ORDER_REJECTED',
        message,
      });
      await queryRunner.manager.save(notification);

      await this.idempotencyService.markProcessed(
        eventId,
        KAFKA_TOPICS.ORDER_REJECTED,
        queryRunner.manager,
      );

      await queryRunner.commitTransaction();

      // Simulate sending email by logging clearly
      this.logger.warn(
        `[EMAIL DISPATCH] 📧 To User '${userId}': Order ${orderId} REJECTED! Reason: ${reason}. (Correlation: ${correlationId})`,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
