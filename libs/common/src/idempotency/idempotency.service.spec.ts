import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IdempotencyService } from './idempotency.service';
import { ProcessedEvent } from '../database/entities/processed-event.entity';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let mockRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        {
          provide: getRepositoryToken(ProcessedEvent),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return true if event has already been processed', async () => {
    mockRepo.findOne.mockResolvedValue({
      eventId: 'evt-123',
      topic: 'order.created',
      processedAt: new Date(),
    });

    const isDup = await service.isProcessed('evt-123');
    expect(isDup).toBe(true);
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { eventId: 'evt-123' },
    });
  });

  it('should return false if event has not been processed', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    const isDup = await service.isProcessed('evt-456');
    expect(isDup).toBe(false);
  });
});
