import { NestFactory } from '@nestjs/core';
import { NotificationServiceModule } from './notification-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('NotificationServiceBootstrap');
  // Standalone application context without listening on HTTP port
  const app = await NestFactory.createApplicationContext(
    NotificationServiceModule,
  );
  app.enableShutdownHooks();
  logger.log('Notification Service Kafka Consumer is actively running');
}
bootstrap();
