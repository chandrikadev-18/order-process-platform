import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  OutboxEvent,
  OutboxStatus,
} from '../database/entities/outbox-event.entity';
import { EventEnvelope } from '../events/event-envelope.interface';

/**
 * Service to manage inserting events into the Transactional Outbox table.
 */
@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
  ) {}

  /**
   * Encapsulates a payload in a standard EventEnvelope and saves it to the outbox table.
   * Accepts an EntityManager to run within an active database transaction.
   */
  async createOutboxEvent<T>(
    topic: string,
    key: string,
    eventType: string,
    payload: T,
    correlationId: string,
    manager?: EntityManager,
  ): Promise<OutboxEvent> {
    const envelope: EventEnvelope<T> = {
      eventId: randomUUID(),
      eventType,
      occurredAt: new Date().toISOString(),
      correlationId: correlationId || randomUUID(),
      payload,
    };

    const repo = manager ? manager.getRepository(OutboxEvent) : this.outboxRepo;

    const outbox = repo.create({
      topic,
      key,
      payload: envelope,
      status: OutboxStatus.PENDING,
    });

    const saved = await repo.save(outbox);
    this.logger.debug(
      `[OUTBOX] Scheduled outbox event ${saved.id} for topic '${topic}' (key: ${key}, correlationId: ${correlationId})`,
    );
    return saved;
  }
}
