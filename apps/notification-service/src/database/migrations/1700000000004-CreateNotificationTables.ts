import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNotificationTables1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. notifications table
    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'order_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 2. processed_events table
    await queryRunner.createTable(
      new Table({
        name: 'processed_events',
        columns: [
          {
            name: 'event_id',
            type: 'varchar',
            length: '128',
            isPrimary: true,
          },
          {
            name: 'topic',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'processed_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('processed_events', true);
    await queryRunner.dropTable('notifications', true);
  }
}
