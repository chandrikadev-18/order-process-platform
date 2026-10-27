import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: {
    findOne: jest.Mock;
    find: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a product if SKU does not exist', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockImplementation((p) => ({ id: 'p-1', ...p }));
    repo.save.mockImplementation((p) => Promise.resolve(p));

    const result = await service.create({
      sku: 'SKU-001',
      name: 'Wireless Mouse',
      price: 29.99,
      stockQuantity: 50,
    });

    expect(result.sku).toBe('SKU-001');
    expect(repo.save).toHaveBeenCalled();
  });

  it('should throw RpcException if SKU already exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'p-1', sku: 'SKU-001' });

    await expect(
      service.create({
        sku: 'SKU-001',
        name: 'Another Mouse',
        price: 19.99,
        stockQuantity: 10,
      }),
    ).rejects.toThrow(RpcException);
  });

  it('should throw RpcException if product not found on findOne', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.findOne('invalid-uuid')).rejects.toThrow(RpcException);
  });

  it('should update stock delta correctly', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p-1',
      name: 'Product 1',
      stockQuantity: 10,
    });
    repo.save.mockImplementation((p) => Promise.resolve(p));

    const updated = await service.updateStock('p-1', undefined, 5);
    expect(updated.stockQuantity).toBe(15);
  });
});
