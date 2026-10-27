/**
 * Shared event envelope representing an asynchronous event published over Kafka.
 * Standardizes metadata across all microservices for distributed tracing,
 * idempotent processing, and outbox pattern delivery.
 */
export interface EventEnvelope<T = any> {
  /** Unique UUID v4 identifying this specific event instance */
  eventId: string;

  /** Domain event name (e.g., 'order.created', 'inventory.reserved') */
  eventType: string;

  /** ISO 8601 timestamp string when the event occurred */
  occurredAt: string;

  /** Distributed tracing identifier propagated across microservices */
  correlationId: string;

  /** Business payload specific to the event type */
  payload: T;
}

/** Payload for order.created event */
export interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/** Payload for inventory.reserved event */
export interface InventoryReservedPayload {
  orderId: string;
  reservationId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

/** Payload for inventory.failed event */
export interface InventoryFailedPayload {
  orderId: string;
  reason: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

/** Payload for order.confirmed event */
export interface OrderConfirmedPayload {
  orderId: string;
  userId: string;
  totalAmount: number;
}

/** Payload for order.rejected event */
export interface OrderRejectedPayload {
  orderId: string;
  userId: string;
  reason: string;
}

/** Payload for order.cancelled event */
export interface OrderCancelledPayload {
  orderId: string;
  userId: string;
}

/** Payload when an event is routed to a Dead Letter Queue (DLQ) */
export interface DlqPayload {
  originalEvent: any;
  error: string;
  stack?: string;
  attempts: number;
  failedAt: string;
}
