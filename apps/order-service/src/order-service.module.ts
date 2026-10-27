import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import {
  CommonModule,
  orderServiceConfigValidationSchema,
  ProcessedEvent,
  OutboxEvent,
} from '@app/common';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { CreateOrderTables1700000000002 } from './database/migrations/1700000000002-CreateOrderTables';
import { OrdersService } from './orders/orders.service';
import { OrderConsumerService } from './kafka/order-consumer.service';
import { OrderOutboxPublisherService } from './outbox/order-outbox-publisher.service';
import { OrderServiceController } from './order-service.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: orderServiceConfigValidationSchema,
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
        database: config.get<string>('DB_NAME', 'order_db'),
        entities: [Order, OrderItem, ProcessedEvent, OutboxEvent],
        migrations: [CreateOrderTables1700000000002],
        synchronize: false,
        migrationsRun: true,
      }),
    }),
    TypeOrmModule.forFeature([Order, OrderItem, ProcessedEvent, OutboxEvent]),
    ClientsModule.registerAsync([
      {
        name: 'INVENTORY_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'inventory',
            protoPath: join(process.cwd(), 'proto/inventory.proto'),
            url: config.get<string>('INVENTORY_GRPC_URL', 'localhost:50052'),
          },
        }),
      },
    ]),
    CommonModule,
  ],
  controllers: [OrderServiceController],
  providers: [OrdersService, OrderConsumerService, OrderOutboxPublisherService],
  exports: [OrdersService],
})
export class OrderServiceModule {}
