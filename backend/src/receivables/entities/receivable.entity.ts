import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ReceivableRepayment } from './receivable-repayment.entity';

export enum ReceivableStatus {
  OUTSTANDING = 'OUTSTANDING',
  PARTIALLY_REPAID = 'PARTIALLY_REPAID',
  REPAID = 'REPAID',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('receivables')
export class Receivable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  borrowerName: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  amount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: toFloat })
  amountRepaid: number;

  @Column({ type: 'date' })
  dateGiven: string;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'enum', enum: ReceivableStatus, default: ReceivableStatus.OUTSTANDING })
  status: ReceivableStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => ReceivableRepayment, (r) => r.receivable, { cascade: true })
  repayments: ReceivableRepayment[];

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
