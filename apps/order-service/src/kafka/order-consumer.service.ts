import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { OrdersService } from '../orders/orders.service';
import {
  KAFKA_TOPICS,
  EventEnvelope,
  InventoryReservedPayload,
  InventoryFailedPayload,
  KafkaRetryHelper,
} from '@app/common';

@Injectable()
export class OrderConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderConsumerService.name);
  private kafka!: Kafka;
  private consumer!: Consumer;
  private producer!: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  async onModuleInit() {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'localhost:9092')
      .split(',');

    this.kafka = new Kafka({
      clientId: 'order-service',
      brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'order-service-group',
    });

    this.producer = this.kafka.producer();

    await this.producer.connect();
    await this.consumer.connect();

    await this.consumer.subscribe({
      topics: [KAFKA_TOPICS.INVENTORY_RESERVED, KAFKA_TOPICS.INVENTORY_FAILED],
      fromBeginning: false,
    });

    this.logger.log('Order Kafka consumer subscribed to topics');

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
              case KAFKA_TOPICS.INVENTORY_RESERVED: {
                const payload = envelope.payload as InventoryReservedPayload;
                await this.ordersService.processInventoryReserved(
                  envelope.eventId,
                  envelope.correlationId,
                  payload,
                );
                break;
              }
              case KAFKA_TOPICS.INVENTORY_FAILED: {
                const payload = envelope.payload as InventoryFailedPayload;
                await this.ordersService.processInventoryFailed(
                  envelope.eventId,
                  envelope.correlationId,
                  payload,
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
