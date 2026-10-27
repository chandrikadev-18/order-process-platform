import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { OutboxEvent, OutboxStatus } from '@app/common';

@Injectable()
export class OrderOutboxPublisherService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OrderOutboxPublisherService.name);
  private kafka!: Kafka;
  private producer!: Producer;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'localhost:9092')
      .split(',');

    this.kafka = new Kafka({
      clientId: 'order-outbox-publisher',
      brokers,
    });

    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.log('Order Outbox Publisher connected to Kafka');

    // Poll every 1s
    this.timer = setInterval(() => {
      this.publishPendingEvents().catch((err) => {
        this.logger.error(
          `Error in order outbox loop: ${err.message}`,
          err.stack,
        );
      });
    }, 1000);
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    await this.producer?.disconnect();
  }

  async publishPendingEvents(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingEvents = await this.outboxRepo.find({
        where: {
          status: OutboxStatus.PENDING,
          createdAt: LessThanOrEqual(new Date()),
        },
        order: { createdAt: 'ASC' },
        take: 50,
      });

      if (!pendingEvents || pendingEvents.length === 0) {
        return;
      }

      this.logger.debug(
        `[ORDER OUTBOX] Found ${pendingEvents.length} pending events to publish`,
      );

      for (const event of pendingEvents) {
        try {
          await this.producer.send({
            topic: event.topic,
            messages: [
              {
                key: Buffer.from(event.key),
                value: Buffer.from(JSON.stringify(event.payload)),
                headers: {
                  'x-correlation-id': event.payload?.correlationId || '',
                  'x-event-id': event.payload?.eventId || event.id,
                },
              },
            ],
          });

          event.status = OutboxStatus.SENT;
          event.sentAt = new Date();
          await this.outboxRepo.save(event);

          this.logger.log(
            `[OUTBOX SENT] Published event ${event.id} to topic '${event.topic}' (key: ${event.key})`,
          );
        } catch (err: any) {
          this.logger.error(
            `[OUTBOX FAILED] Failed to publish outbox event ${event.id}: ${err.message}`,
            err.stack,
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }
}
