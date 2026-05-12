import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Budget } from './budget.entity';

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('budget_items')
export class BudgetItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  category: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  allocatedAmount: number;

  @Column({ default: false })
  isPreDeduction: boolean;

  @ManyToOne(() => Budget, (b) => b.items, { onDelete: 'CASCADE' })
  budget: Budget;

  @Column()
  budgetId: string;
}
