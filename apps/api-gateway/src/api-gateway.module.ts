import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { apiGatewayConfigValidationSchema } from '@app/common';
import { User } from './users/entities/user.entity';
import { CreateUsersTable1700000000001 } from './database/migrations/1700000000001-CreateUsersTable';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { ProductsController } from './products/products.controller';
import { OrdersController } from './orders/orders.controller';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: apiGatewayConfigValidationSchema,
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
        database: config.get<string>('DB_NAME', 'gateway_db'),
        entities: [User],
        migrations: [CreateUsersTable1700000000001],
        synchronize: false,
        migrationsRun: true,
      }),
    }),
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_SECRET',
          'super-secret-jwt-key-for-development-antigravity',
        ),
        signOptions: {
          expiresIn: config.get<any>('JWT_EXPIRES_IN', '24h'),
        },
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: 'ORDER_PACKAGE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'order',
            protoPath: join(process.cwd(), 'proto/order.proto'),
            url: config.get<string>('ORDER_GRPC_URL', 'localhost:50051'),
          },
        }),
      },
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
  ],
  controllers: [
    AuthController,
    ProductsController,
    OrdersController,
    HealthController,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class ApiGatewayModule {}
