import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { User } from '../../users/entities/user.entity';

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('account_transfers')
export class AccountTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  fromAccount: Account;

  @Column()
  fromAccountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  toAccount: Account;

  @Column()
  toAccountId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
