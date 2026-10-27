import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CommonModule,
  inventoryServiceConfigValidationSchema,
  ProcessedEvent,
  OutboxEvent,
} from '@app/common';
import { Product } from './products/entities/product.entity';
import { StockReservation } from './reservations/entities/stock-reservation.entity';
import { ReservationItem } from './reservations/entities/reservation-item.entity';
import { CreateInventoryTables1700000000003 } from './database/migrations/1700000000003-CreateInventoryTables';
import { ProductsService } from './products/products.service';
import { ReservationsService } from './reservations/reservations.service';
import { InventoryConsumerService } from './kafka/inventory-consumer.service';
import { InventoryOutboxPublisherService } from './outbox/inventory-outbox-publisher.service';
import { InventoryServiceController } from './inventory-service.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: inventoryServiceConfigValidationSchema,
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
        database: config.get<string>('DB_NAME', 'inventory_db'),
        entities: [
          Product,
          StockReservation,
          ReservationItem,
          ProcessedEvent,
          OutboxEvent,
        ],
        migrations: [CreateInventoryTables1700000000003],
        synchronize: false,
        migrationsRun: true,
      }),
    }),
    TypeOrmModule.forFeature([
      Product,
      StockReservation,
      ReservationItem,
      ProcessedEvent,
      OutboxEvent,
    ]),
    CommonModule,
  ],
  controllers: [InventoryServiceController],
  providers: [
    ProductsService,
    ReservationsService,
    InventoryConsumerService,
    InventoryOutboxPublisherService,
  ],
  exports: [ProductsService, ReservationsService],
})
export class InventoryServiceModule {}
