import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface InsightItem {
  id: string;
  type: 'warning' | 'opportunity' | 'info' | 'celebration';
  category: 'cash_flow' | 'debt' | 'savings' | 'investments' | 'goals' | 'general';
  title: string;
  body: string;
  action: string | null;
  priority: 'high' | 'medium' | 'low';
}

@Entity('user_insights')
export class UserInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'jsonb', default: '[]' })
  insights: InsightItem[];

  @CreateDateColumn()
  generatedAt: Date;
}
