import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Entity to track processed event IDs per service.
 * Guarantees idempotent consumer behavior by persisting processed event IDs
 * inside the same atomic database transaction as the business changes.
 */
@Entity({ name: 'processed_events' })
export class ProcessedEvent {
  /** The unique eventId (UUID) from the EventEnvelope */
  @PrimaryColumn({ name: 'event_id', type: 'varchar', length: 128 })
  eventId!: string;

  /** Topic the event originated from */
  @Column({ type: 'varchar', length: 128 })
  topic!: string;

  /** Timestamp when the event was processed */
  @CreateDateColumn({ name: 'processed_at', type: 'timestamp with time zone' })
  processedAt!: Date;
}
