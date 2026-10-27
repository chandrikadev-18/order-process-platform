import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessedEvent } from './database/entities/processed-event.entity';
import { OutboxEvent } from './database/entities/outbox-event.entity';
import { IdempotencyService } from './idempotency/idempotency.service';
import { OutboxService } from './outbox/outbox.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessedEvent, OutboxEvent])],
  providers: [IdempotencyService, OutboxService],
  exports: [TypeOrmModule, IdempotencyService, OutboxService],
})
export class CommonModule {}
