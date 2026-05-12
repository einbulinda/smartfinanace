import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AccountType {
  BANK = 'BANK',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CASH = 'CASH',
  SACCO = 'SACCO',
  INVESTMENT = 'INVESTMENT',
  CREDIT = 'CREDIT',
}

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ type: 'varchar', length: 3, default: 'KES' })
  currency: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: toFloat })
  initialBalance: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
