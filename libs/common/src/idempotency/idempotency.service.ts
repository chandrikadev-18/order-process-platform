import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { ProcessedEvent } from '../database/entities/processed-event.entity';

/**
 * Idempotency Service
 * Provides helpers to detect and prevent duplicate event processing across microservices.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectRepository(ProcessedEvent)
    private readonly processedRepo: Repository<ProcessedEvent>,
  ) {}

  /**
   * Checks if an event has already been processed by checking the processed_events table.
   * If a transaction manager is supplied, query executes within that transaction.
   */
  async isProcessed(
    eventId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager
      ? manager.getRepository(ProcessedEvent)
      : this.processedRepo;

    const existing = await repo.findOne({ where: { eventId } });
    if (existing) {
      this.logger.warn(
        `[IDEMPOTENCY] Event ${eventId} on topic '${existing.topic}' already processed at ${existing.processedAt.toISOString()}. Skipping.`,
      );
      return true;
    }
    return false;
  }

  /**
   * Records an event as processed.
   * Must be executed within the same database transaction as the business change.
   */
  async markProcessed(
    eventId: string,
    topic: string,
    manager: EntityManager,
  ): Promise<ProcessedEvent> {
    const repo = manager.getRepository(ProcessedEvent);
    const processed = repo.create({
      eventId,
      topic,
    });
    return repo.save(processed);
  }
}
