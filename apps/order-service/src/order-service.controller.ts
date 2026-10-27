import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OrdersService } from './orders/orders.service';
import { LoggingInterceptor, CorrelationIdInterceptor } from '@app/common';

@Controller()
@UseInterceptors(CorrelationIdInterceptor, LoggingInterceptor)
export class OrderServiceController {
  constructor(private readonly ordersService: OrdersService) {}

  @GrpcMethod('OrderService', 'CreateOrder')
  async createOrder(data: {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    correlationId?: string;
  }) {
    const order = await this.ordersService.createOrder(data);
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      items: (order.items || []).map((i) => ({
        id: i.id,
        orderId: i.orderId,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  @GrpcMethod('OrderService', 'GetOrder')
  async getOrder(data: { id: string; userId?: string }) {
    const order = await this.ordersService.getOrder(data.id, data.userId);
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      items: (order.items || []).map((i) => ({
        id: i.id,
        orderId: i.orderId,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  @GrpcMethod('OrderService', 'ListOrders')
  async listOrders(data: { userId: string; page?: number; limit?: number }) {
    const page = data.page && data.page > 0 ? data.page : 1;
    const limit = data.limit && data.limit > 0 ? data.limit : 20;
    const result = await this.ordersService.listOrders(
      data.userId,
      page,
      limit,
    );
    return {
      orders: result.orders.map((order) => ({
        id: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        items: (order.items || []).map((i) => ({
          id: i.id,
          orderId: i.orderId,
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @GrpcMethod('OrderService', 'CancelOrder')
  async cancelOrder(data: { id: string; userId?: string }) {
    const order = await this.ordersService.cancelOrder(data.id, data.userId);
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      items: (order.items || []).map((i) => ({
        id: i.id,
        orderId: i.orderId,
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
