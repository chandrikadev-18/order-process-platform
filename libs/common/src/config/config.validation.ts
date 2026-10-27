import * as Joi from 'joi';

/**
 * Common Joi validation schema for database connection configuration.
 */
export const dbConfigValidationSchema = {
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASSWORD: Joi.string().default('postgres'),
  DB_NAME: Joi.string().required(),
};

/**
 * Common Joi validation schema for Kafka broker configuration.
 */
export const kafkaConfigValidationSchema = {
  KAFKA_BROKERS: Joi.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: Joi.string().default('order-processing-platform'),
  KAFKA_GROUP_ID: Joi.string().default('default-group'),
};

/**
 * Validation schema for API Gateway configuration.
 */
export const apiGatewayConfigValidationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string()
    .min(8)
    .default('super-secret-jwt-key-for-development-antigravity'),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  ORDER_GRPC_URL: Joi.string().default('localhost:50051'),
  INVENTORY_GRPC_URL: Joi.string().default('localhost:50052'),
  ...dbConfigValidationSchema,
});

/**
 * Validation schema for Order Service configuration.
 */
export const orderServiceConfigValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),
  GRPC_PORT: Joi.number().default(50051),
  INVENTORY_GRPC_URL: Joi.string().default('localhost:50052'),
  ...dbConfigValidationSchema,
  ...kafkaConfigValidationSchema,
});

/**
 * Validation schema for Inventory Service configuration.
 */
export const inventoryServiceConfigValidationSchema = Joi.object({
  PORT: Joi.number().default(3002),
  GRPC_PORT: Joi.number().default(50052),
  ...dbConfigValidationSchema,
  ...kafkaConfigValidationSchema,
});

/**
 * Validation schema for Notification Service configuration.
 */
export const notificationServiceConfigValidationSchema = Joi.object({
  PORT: Joi.number().default(3003),
  ...dbConfigValidationSchema,
  ...kafkaConfigValidationSchema,
});
