/**
 * Centralized Kafka topic names and DLQ topic helpers.
 * Guaranteed consistent naming across producers and consumers.
 */
export const KAFKA_TOPICS = {
  ORDER_CREATED: 'order.created',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_FAILED: 'inventory.failed',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_REJECTED: 'order.rejected',
  ORDER_CANCELLED: 'order.cancelled',

  // Dead Letter Queue topics
  ORDER_CREATED_DLQ: 'order.created.dlq',
  INVENTORY_RESERVED_DLQ: 'inventory.reserved.dlq',
  INVENTORY_FAILED_DLQ: 'inventory.failed.dlq',
  ORDER_CONFIRMED_DLQ: 'order.confirmed.dlq',
  ORDER_REJECTED_DLQ: 'order.rejected.dlq',
  ORDER_CANCELLED_DLQ: 'order.cancelled.dlq',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

/**
 * Returns corresponding Dead Letter Queue topic name for any given topic.
 * Appends '.dlq' suffix.
 */
export function getDlqTopic(topic: string): string {
  return `${topic}.dlq`;
}
