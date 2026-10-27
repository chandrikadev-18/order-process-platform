import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async create(data: {
    sku: string;
    name: string;
    price: number;
    stockQuantity: number;
  }): Promise<Product> {
    const existing = await this.productRepo.findOne({
      where: { sku: data.sku },
    });
    if (existing) {
      throw new RpcException({
        code: GrpcStatus.ALREADY_EXISTS,
        message: `Product with SKU '${data.sku}' already exists`,
      });
    }

    const product = this.productRepo.create({
      sku: data.sku,
      name: data.name,
      price: data.price,
      stockQuantity: data.stockQuantity,
    });
    return this.productRepo.save(product);
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Product with ID '${id}' not found`,
      });
    }
    return product;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (!ids || ids.length === 0) return [];
    return this.productRepo.find({ where: { id: In(ids) } });
  }

  async list(
    page = 1,
    limit = 20,
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [products, total] = await this.productRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { products, total, page, limit };
  }

  async updateStock(
    id: string,
    newStock?: number,
    delta?: number,
  ): Promise<Product> {
    const product = await this.findOne(id);

    if (newStock !== undefined && newStock !== null) {
      if (newStock < 0) {
        throw new RpcException({
          code: GrpcStatus.INVALID_ARGUMENT,
          message: 'Stock quantity cannot be negative',
        });
      }
      product.stockQuantity = newStock;
    } else if (delta !== undefined && delta !== null) {
      if (product.stockQuantity + delta < 0) {
        throw new RpcException({
          code: GrpcStatus.FAILED_PRECONDITION,
          message: `Insufficient stock for product '${product.name}'. Current: ${product.stockQuantity}, Delta: ${delta}`,
        });
      }
      product.stockQuantity += delta;
    }

    return this.productRepo.save(product);
  }
}
