import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';
import { InventoryServiceModule } from './inventory-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('InventoryServiceBootstrap');
  const grpcPort = process.env.GRPC_PORT || 50052;

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryServiceModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'inventory',
        protoPath: join(process.cwd(), 'proto/inventory.proto'),
        url: `0.0.0.0:${grpcPort}`,
      },
    },
  );

  await app.listen();
  logger.log(`Inventory gRPC Service is running on port ${grpcPort}`);
}
bootstrap();
