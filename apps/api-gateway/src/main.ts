import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ApiGatewayModule } from './api-gateway.module';
import {
  GrpcToHttpExceptionFilter,
  CorrelationIdInterceptor,
  LoggingInterceptor,
} from '@app/common';

async function bootstrap() {
  const logger = new Logger('ApiGatewayBootstrap');
  const app = await NestFactory.create(ApiGatewayModule);

  // Global Interceptors
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new LoggingInterceptor(),
  );

  // Global Exception Filter for gRPC -> HTTP error mapping
  app.useGlobalFilters(new GrpcToHttpExceptionFilter());

  // Global Request Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Order Processing Platform API')
    .setDescription(
      'Production-style Event-Driven Microservices Platform with NestJS, gRPC, Apache Kafka, and PostgreSQL',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and registration endpoints')
    .addTag('Products', 'Product catalog and inventory management')
    .addTag('Orders', 'Order placement and lifecycle management')
    .addTag('Health', 'Platform health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`API Gateway is running on http://localhost:${port}`);
  logger.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
  );
}
bootstrap();
