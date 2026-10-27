import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CommonModule,
  notificationServiceConfigValidationSchema,
  ProcessedEvent,
} from '@app/common';
import { Notification } from './notifications/entities/notification.entity';
import { CreateNotificationTables1700000000004 } from './database/migrations/1700000000004-CreateNotificationTables';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationConsumerService } from './kafka/notification-consumer.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: notificationServiceConfigValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'postgres'),
        database: config.get<string>('DB_NAME', 'notification_db'),
        entities: [Notification, ProcessedEvent],
        migrations: [CreateNotificationTables1700000000004],
        synchronize: false,
        migrationsRun: true,
      }),
    }),
    TypeOrmModule.forFeature([Notification, ProcessedEvent]),
    CommonModule,
  ],
  providers: [NotificationsService, NotificationConsumerService],
  exports: [NotificationsService],
})
export class NotificationServiceModule {}
