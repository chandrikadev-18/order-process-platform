import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RpcException } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { IdempotencyService, OutboxService } from '@app/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let orderItemRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn().mockImplementation((entity, obj) => obj),
      save: jest
        .fn()
        .mockImplementation((obj) =>
          Promise.resolve({ id: 'mock-order-id', ...obj }),
        ),
      findOne: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockIdempotency = {
    isProcessed: jest.fn().mockResolvedValue(false),
    markProcessed: jest.fn().mockResolvedValue(undefined),
  };

  const mockOutbox = {
    createOutboxEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
  };

  const mockClientGrpc = {
    getService: jest.fn().mockReturnValue({
      getProducts: jest.fn(),
    }),
  };

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    orderItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: orderItemRepo,
        },
        {
          provide: 'INVENTORY_PACKAGE',
          useValue: mockClientGrpc,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotency,
        },
        {
          provide: OutboxService,
          useValue: mockOutbox,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrder', () => {
    it('should throw RpcException if order is not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.getOrder('invalid-order-id')).rejects.toThrow(
        RpcException,
      );
    });

    it('should return the order if found', async () => {
      const mockOrder = {
        id: 'ord-1',
        userId: 'u-1',
        status: OrderStatus.CONFIRMED,
        totalAmount: 100,
        items: [],
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      const res = await service.getOrder('ord-1');
      expect(res.id).toBe('ord-1');
      expect(res.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('cancelOrder', () => {
    it('should throw RpcException if already CANCELLED', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.CANCELLED,
      });

      await expect(service.cancelOrder('ord-1')).rejects.toThrow(RpcException);
    });
  });
});
