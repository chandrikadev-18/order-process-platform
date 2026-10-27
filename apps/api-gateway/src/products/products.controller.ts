import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Inject,
  OnModuleInit,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

interface InventoryGrpcClient {
  listProducts(data: { page?: number; limit?: number }): Observable<{
    products: any[];
    total: number;
    page: number;
    limit: number;
  }>;
  getProduct(data: { id: string }): Observable<any>;
  createProduct(data: any): Observable<any>;
  updateStock(data: any): Observable<any>;
}

@ApiTags('Products')
@Controller('products')
export class ProductsController implements OnModuleInit {
  private inventoryClient!: InventoryGrpcClient;

  constructor(
    @Inject('INVENTORY_PACKAGE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.inventoryClient =
      this.client.getService<InventoryGrpcClient>('InventoryService');
  }

  @Get()
  @ApiOperation({ summary: 'List all products with pagination (Public)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated list of products' })
  async listProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return firstValueFrom(
      this.inventoryClient.listProducts({ page: pageNum, limit: limitNum }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(@Param('id') id: string) {
    return firstValueFrom(this.inventoryClient.getProduct({ id }));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (ADMIN role required)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  async createProduct(@Body() dto: CreateProductDto) {
    return firstValueFrom(this.inventoryClient.createProduct(dto));
  }

  @Patch(':id/stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product stock level (ADMIN role required)' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return firstValueFrom(
      this.inventoryClient.updateStock({
        id,
        stockQuantity: dto.stockQuantity,
        delta: dto.delta,
      }),
    );
  }
}
