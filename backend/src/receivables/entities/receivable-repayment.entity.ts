import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Receivable } from './receivable.entity';

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('receivable_repayments')
export class ReceivableRepayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Receivable, (r) => r.repayments, { onDelete: 'CASCADE' })
  receivable: Receivable;

  @Column()
  receivableId: string;

  @CreateDateColumn()
  createdAt: Date;
}
