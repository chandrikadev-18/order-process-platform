import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  OnModuleInit,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';

interface OrderGrpcClient {
  createOrder(data: {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    correlationId?: string;
  }): Observable<any>;
  getOrder(data: { id: string; userId?: string }): Observable<any>;
  listOrders(data: {
    userId: string;
    page?: number;
    limit?: number;
  }): Observable<{ orders: any[]; total: number; page: number; limit: number }>;
  cancelOrder(data: { id: string; userId?: string }): Observable<any>;
}

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController implements OnModuleInit {
  private orderClient!: OrderGrpcClient;

  constructor(
    @Inject('ORDER_PACKAGE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.orderClient = this.client.getService<OrderGrpcClient>('OrderService');
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order (JWT required)' })
  @ApiResponse({ status: 201, description: 'Order created in PENDING state' })
  @ApiResponse({ status: 400, description: 'Invalid request body or items' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async createOrder(
    @CurrentUser() user: any,
    @Body() dto: CreateOrderDto,
    @Req() req: Request & { correlationId?: string },
  ) {
    const correlationId =
      req.correlationId || (req.headers['x-correlation-id'] as string) || '';

    return firstValueFrom(
      this.orderClient.createOrder({
        userId: user.id,
        items: dto.items,
        correlationId,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID (JWT required)' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(@CurrentUser() user: any, @Param('id') id: string) {
    // Regular users can only fetch their own orders; admins can view any order
    const userIdFilter = user.role === 'ADMIN' ? undefined : user.id;
    return firstValueFrom(
      this.orderClient.getOrder({ id, userId: userIdFilter }),
    );
  }

  @Get()
  @ApiOperation({ summary: "List logged-in user's orders with pagination" })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated user orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listOrders(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    return firstValueFrom(
      this.orderClient.listOrders({
        userId: user.id,
        page: pageNum,
        limit: limitNum,
      }),
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order and release stock (JWT required)' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel order in current state',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@CurrentUser() user: any, @Param('id') id: string) {
    const userIdFilter = user.role === 'ADMIN' ? undefined : user.id;
    return firstValueFrom(
      this.orderClient.cancelOrder({ id, userId: userIdFilter }),
    );
  }
}
