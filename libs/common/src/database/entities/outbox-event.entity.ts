import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum OutboxStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * Transactional Outbox Entity.
 * Guarantees Dual-Write Consistency by saving domain events to the outbox table
 * in the exact same ACID database transaction as domain changes.
 * A background worker polls PENDING outbox events and reliably publishes them to Kafka.
 */
@Entity({ name: 'outbox_events' })
@Index(['status', 'createdAt'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Kafka topic to publish to */
  @Column({ type: 'varchar', length: 128 })
  topic!: string;

  /** Kafka partition key (e.g., orderId to guarantee partition ordering) */
  @Column({ type: 'varchar', length: 128 })
  key!: string;

  /** Full JSON payload conforming to EventEnvelope */
  @Column({ type: 'jsonb' })
  payload!: any;

  /** Outbox status: PENDING, SENT, or FAILED */
  @Column({
    type: 'varchar',
    length: 32,
    default: OutboxStatus.PENDING,
  })
  status!: OutboxStatus;

  /** Timestamp when event was inserted into outbox */
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  /** Timestamp when event was successfully acknowledged by Kafka */
  @Column({
    name: 'sent_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  sentAt!: Date | null;
}
