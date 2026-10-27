import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ProductsService } from './products/products.service';
import { LoggingInterceptor, CorrelationIdInterceptor } from '@app/common';

@Controller()
@UseInterceptors(CorrelationIdInterceptor, LoggingInterceptor)
export class InventoryServiceController {
  constructor(private readonly productsService: ProductsService) {}

  @GrpcMethod('InventoryService', 'ListProducts')
  async listProducts(data: { page?: number; limit?: number }) {
    const page = data.page && data.page > 0 ? data.page : 1;
    const limit = data.limit && data.limit > 0 ? data.limit : 20;
    const result = await this.productsService.list(page, limit);
    return {
      products: result.products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        price: p.price,
        stockQuantity: p.stockQuantity,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @GrpcMethod('InventoryService', 'GetProduct')
  async getProduct(data: { id: string }) {
    const p = await this.productsService.findOne(data.id);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: p.price,
      stockQuantity: p.stockQuantity,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  @GrpcMethod('InventoryService', 'GetProducts')
  async getProducts(data: { ids: string[] }) {
    const products = await this.productsService.findByIds(data.ids || []);
    return {
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        price: p.price,
        stockQuantity: p.stockQuantity,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  @GrpcMethod('InventoryService', 'CreateProduct')
  async createProduct(data: {
    sku: string;
    name: string;
    price: number;
    stockQuantity: number;
  }) {
    const p = await this.productsService.create({
      sku: data.sku,
      name: data.name,
      price: data.price,
      stockQuantity: data.stockQuantity,
    });
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: p.price,
      stockQuantity: p.stockQuantity,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  @GrpcMethod('InventoryService', 'UpdateStock')
  async updateStock(data: {
    id: string;
    stockQuantity?: number;
    delta?: number;
  }) {
    const p = await this.productsService.updateStock(
      data.id,
      data.stockQuantity,
      data.delta,
    );
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: p.price,
      stockQuantity: p.stockQuantity,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
