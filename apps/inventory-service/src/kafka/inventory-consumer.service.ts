import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { ReservationsService } from '../reservations/reservations.service';
import {
  KAFKA_TOPICS,
  EventEnvelope,
  OrderCreatedPayload,
  OrderRejectedPayload,
  OrderCancelledPayload,
  KafkaRetryHelper,
} from '@app/common';

@Injectable()
export class InventoryConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryConsumerService.name);
  private kafka!: Kafka;
  private consumer!: Consumer;
  private producer!: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly reservationsService: ReservationsService,
  ) {}

  async onModuleInit() {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'localhost:9092')
      .split(',');

    this.kafka = new Kafka({
      clientId: 'inventory-service',
      brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'inventory-service-group',
    });

    this.producer = this.kafka.producer();

    await this.producer.connect();
    await this.consumer.connect();

    await this.consumer.subscribe({
      topics: [
        KAFKA_TOPICS.ORDER_CREATED,
        KAFKA_TOPICS.ORDER_REJECTED,
        KAFKA_TOPICS.ORDER_CANCELLED,
      ],
      fromBeginning: false,
    });

    this.logger.log('Inventory Kafka consumer subscribed to topics');

    // Run message consumption with autoCommit disabled for manual offset management
    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        const fakeContext: any = {
          getMessage: () => message,
          getTopic: () => topic,
          getPartition: () => partition,
          getConsumer: () => this.consumer,
        };

        await KafkaRetryHelper.handleWithRetry({
          context: fakeContext,
          producer: this.producer,
          handler: async () => {
            const raw = message.value?.toString();
            if (!raw) return;

            const envelope: EventEnvelope = JSON.parse(raw);

            // Poison pill check for testing retries and DLQ
            if (raw.includes('FORCE_POISON_PILL')) {
              throw new Error(
                'Forced poison message error for DLQ verification',
              );
            }

            switch (topic) {
              case KAFKA_TOPICS.ORDER_CREATED: {
                const payload = envelope.payload as OrderCreatedPayload;
                await this.reservationsService.processOrderCreated(
                  envelope.eventId,
                  envelope.correlationId,
                  payload,
                );
                break;
              }
              case KAFKA_TOPICS.ORDER_REJECTED: {
                const payload = envelope.payload as OrderRejectedPayload;
                await this.reservationsService.releaseStock(
                  envelope.eventId,
                  topic,
                  payload.orderId,
                );
                break;
              }
              case KAFKA_TOPICS.ORDER_CANCELLED: {
                const payload = envelope.payload as OrderCancelledPayload;
                await this.reservationsService.releaseStock(
                  envelope.eventId,
                  topic,
                  payload.orderId,
                );
                break;
              }
            }
          },
        });
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer?.disconnect();
    await this.producer?.disconnect();
  }
}
