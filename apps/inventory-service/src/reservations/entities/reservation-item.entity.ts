import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StockReservation } from './stock-reservation.entity';

@Entity({ name: 'reservation_items' })
export class ReservationItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reservation_id', type: 'uuid' })
  reservationId!: string;

  @ManyToOne(() => StockReservation, (res) => res.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation!: StockReservation;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ type: 'int' })
  quantity!: number;
}
