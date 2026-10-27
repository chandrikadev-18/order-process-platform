import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateInventoryTables1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. products table
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'sku',
            type: 'varchar',
            length: '128',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'price',
            type: 'numeric',
            precision: 12,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'stock_quantity',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // CHECK constraint: stock_quantity >= 0
    await queryRunner.createCheckConstraint(
      'products',
      new TableCheck({
        name: 'CHK_PRODUCTS_STOCK_NON_NEGATIVE',
        expression: 'stock_quantity >= 0',
      }),
    );

    await queryRunner.createIndex(
      'products',
      new TableIndex({
        name: 'IDX_PRODUCTS_SKU',
        columnNames: ['sku'],
        isUnique: true,
      }),
    );

    // 2. stock_reservations table
    await queryRunner.createTable(
      new Table({
        name: 'stock_reservations',
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
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: "'RESERVED'",
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

    await queryRunner.createIndex(
      'stock_reservations',
      new TableIndex({
        name: 'IDX_RESERVATIONS_ORDER_ID',
        columnNames: ['order_id'],
        isUnique: true,
      }),
    );

    // 3. reservation_items table
    await queryRunner.createTable(
      new Table({
        name: 'reservation_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'reservation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'int',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'reservation_items',
      new TableForeignKey({
        columnNames: ['reservation_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stock_reservations',
        onDelete: 'CASCADE',
      }),
    );

    // 4. processed_events table
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

    // 5. outbox_events table
    await queryRunner.createTable(
      new Table({
        name: 'outbox_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'topic',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'key',
            type: 'varchar',
            length: '128',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '32',
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'sent_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'IDX_INVENTORY_OUTBOX_STATUS_CREATED',
        columnNames: ['status', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('outbox_events', true);
    await queryRunner.dropTable('processed_events', true);
    await queryRunner.dropTable('reservation_items', true);
    await queryRunner.dropTable('stock_reservations', true);
    await queryRunner.dropTable('products', true);
  }
}
