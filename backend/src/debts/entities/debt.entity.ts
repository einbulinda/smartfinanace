import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DebtType {
  BANK_LOAN = 'BANK_LOAN',
  SACCO = 'SACCO',
  CREDIT_CARD = 'CREDIT_CARD',
  PERSONAL = 'PERSONAL',
  MORTGAGE = 'MORTGAGE',
  OTHER = 'OTHER',
}

// TypeORM returns decimal columns as strings — transformer ensures they stay numbers
const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: DebtType })
  type: DebtType;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: toFloat })
  originalAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: toFloat })
  currentBalance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, transformer: toFloat })
  interestRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: toFloat })
  minimumPayment: number | null;

  @Column({ type: 'int', nullable: true })
  dueDate: number | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ default: false })
  isPaidOff: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
