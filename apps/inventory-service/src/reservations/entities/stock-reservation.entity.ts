import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ReservationItem } from './reservation-item.entity';

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  RELEASED = 'RELEASED',
}

@Entity({ name: 'stock_reservations' })
export class StockReservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  @Index({ unique: true })
  orderId!: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: ReservationStatus.RESERVED,
  })
  status!: ReservationStatus;

  @OneToMany(() => ReservationItem, (item) => item.reservation, {
    cascade: true,
  })
  items!: ReservationItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
