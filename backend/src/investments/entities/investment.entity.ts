import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum InvestmentType {
  STOCKS = 'STOCKS',
  BONDS = 'BONDS',
  MUTUAL_FUNDS = 'MUTUAL_FUNDS',
  MONEY_MARKET = 'MONEY_MARKET',
  CRYPTO = 'CRYPTO',
  REAL_ESTATE = 'REAL_ESTATE',
  SACCO = 'SACCO',
  OTHER = 'OTHER',
}

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('investments')
export class Investment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: InvestmentType })
  type: InvestmentType;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  amountInvested: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  currentValue: number;

  @Column({ type: 'date' })
  purchaseDate: string;

  @Column({ type: 'text', nullable: true })
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
