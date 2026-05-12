import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum GoalType {
  SAVINGS = 'SAVINGS',
  DEBT_PAYOFF = 'DEBT_PAYOFF',
  INVESTMENT_GROWTH = 'INVESTMENT_GROWTH',
  INCOME = 'INCOME',
  EXPENSE_REDUCTION = 'EXPENSE_REDUCTION',
  NET_WORTH = 'NET_WORTH',
  CUSTOM = 'CUSTOM',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  PAUSED = 'PAUSED',
  ABANDONED = 'ABANDONED',
}

const decimalTransformer = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? null : parseFloat(v)),
};

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: GoalType, default: GoalType.CUSTOM })
  type: GoalType;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  targetValue: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, transformer: decimalTransformer })
  currentValue: number | null;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  targetDate: string;

  @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.ACTIVE })
  status: GoalStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
