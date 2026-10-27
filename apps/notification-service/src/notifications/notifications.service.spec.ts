import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { IdempotencyService } from '@app/common';

describe('NotificationsService', () => {
  let service: NotificationsService;

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
          Promise.resolve({ id: 'notif-1', ...obj }),
        ),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockIdempotency = {
    isProcessed: jest.fn().mockResolvedValue(false),
    markProcessed: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotency,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should process order.confirmed and save notification', async () => {
    await service.handleOrderConfirmed('evt-1', 'corr-1', {
      orderId: 'ord-123',
      userId: 'user-456',
      totalAmount: 199.98,
    });

    expect(mockQueryRunner.manager.create).toHaveBeenCalled();
    expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    expect(mockIdempotency.markProcessed).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should process order.rejected and save notification', async () => {
    await service.handleOrderRejected('evt-2', 'corr-2', {
      orderId: 'ord-789',
      userId: 'user-456',
      reason: 'INSUFFICIENT_STOCK',
    });

    expect(mockQueryRunner.manager.create).toHaveBeenCalled();
    expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    expect(mockIdempotency.markProcessed).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
  });
});
