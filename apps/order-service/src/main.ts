import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';
import { OrderServiceModule } from './order-service.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('OrderServiceBootstrap');
  const grpcPort = process.env.GRPC_PORT || 50051;

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrderServiceModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'order',
        protoPath: join(process.cwd(), 'proto/order.proto'),
        url: `0.0.0.0:${grpcPort}`,
      },
    },
  );

  await app.listen();
  logger.log(`Order gRPC Service is running on port ${grpcPort}`);
}
bootstrap();
