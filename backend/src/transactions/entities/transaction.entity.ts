import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  category: string;

  @Column({ type: 'varchar', nullable: true })
  subCategory: string | null;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({ type: 'enum', enum: RecurringFrequency, nullable: true })
  recurringFrequency: RecurringFrequency | null;

  // Optional link to the account this transaction belongs to
  @Column({ type: 'varchar', nullable: true })
  accountId: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'varchar', nullable: true })
  projectId: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
