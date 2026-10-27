import { Logger } from '@nestjs/common';
import { KafkaContext } from '@nestjs/microservices';
import { Producer } from 'kafkajs';
import { randomUUID } from 'crypto';
import { getDlqTopic } from '../events/event-topics.constants';
import { EventEnvelope, DlqPayload } from '../events/event-envelope.interface';

export interface RetryOptions {
  maxAttempts?: number;
  initialBackoffMs?: number;
  backoffFactor?: number;
}

/**
 * Helper to execute Kafka message handlers with automatic exponential backoff retry
 * and dead-letter queue (DLQ) routing upon exhaustion.
 */
export class KafkaRetryHelper {
  private static readonly logger = new Logger('KafkaRetryHelper');

  /**
   * Processes a Kafka event with retries and dead letter queuing on fatal failure.
   * Disables auto-blocking by committing the offset once processed or DLQ'd.
   */
  static async handleWithRetry(params: {
    context: KafkaContext;
    producer: Producer;
    handler: () => Promise<void>;
    options?: RetryOptions;
  }): Promise<void> {
    const { context, producer, handler, options } = params;
    const maxAttempts = options?.maxAttempts ?? 3;
    const initialBackoffMs = options?.initialBackoffMs ?? 1000;
    const backoffFactor = options?.backoffFactor ?? 2;

    const message = context.getMessage();
    const topic = context.getTopic();
    const partition = context.getPartition();
    const consumer = context.getConsumer();
    const offset = message.offset;
    const key = message.key ? message.key.toString() : '';

    let rawValue: any;
    try {
      rawValue = message.value ? JSON.parse(message.value.toString()) : null;
    } catch {
      rawValue = message.value?.toString();
    }

    const correlationId =
      rawValue?.correlationId ||
      message.headers?.['x-correlation-id']?.toString() ||
      randomUUID();

    let attempt = 1;
    let delay = initialBackoffMs;

    while (attempt <= maxAttempts) {
      try {
        await handler();

        // Successful execution -> commit offset manually
        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: (BigInt(offset) + BigInt(1)).toString(),
          },
        ]);
        return;
      } catch (err: any) {
        this.logger.warn(
          `[RETRY ${attempt}/${maxAttempts}] Failure processing event on topic '${topic}' (key: '${key}', correlationId: '${correlationId}'): ${err.message}`,
        );

        if (attempt === maxAttempts) {
          // Exhausted all retries -> Route to DLQ
          const dlqTopic = getDlqTopic(topic);
          const dlqPayload: EventEnvelope<DlqPayload> = {
            eventId: randomUUID(),
            eventType: dlqTopic,
            occurredAt: new Date().toISOString(),
            correlationId,
            payload: {
              originalEvent: rawValue,
              error: err.message || 'Unknown processing error',
              stack: err.stack,
              attempts: maxAttempts,
              failedAt: new Date().toISOString(),
            },
          };

          this.logger.error(
            `[DLQ ROUTE] Moving poison event to DLQ '${dlqTopic}' (key: '${key}', correlationId: '${correlationId}')`,
            err.stack,
          );

          try {
            await producer.send({
              topic: dlqTopic,
              messages: [
                {
                  key: Buffer.from(key),
                  value: Buffer.from(JSON.stringify(dlqPayload)),
                  headers: {
                    'x-correlation-id': correlationId,
                    'x-original-topic': topic,
                    'x-error-message': err.message || '',
                  },
                },
              ],
            });
          } catch (dlqErr: any) {
            this.logger.error(
              `[DLQ FAILURE] Failed to publish message to DLQ topic '${dlqTopic}': ${dlqErr.message}`,
              dlqErr.stack,
            );
          }

          // Commit offset so consumer does not stay blocked on poison message
          await consumer.commitOffsets([
            {
              topic,
              partition,
              offset: (BigInt(offset) + BigInt(1)).toString(),
            },
          ]);
          return;
        }

        // Wait before next attempt with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffFactor;
        attempt++;
      }
    }
  }
}
