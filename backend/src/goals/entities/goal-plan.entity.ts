import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Goal } from './goal.entity';

export interface GoalMilestone {
  id: string;
  title: string;
  description: string | null;
  targetDate: string;
  targetValue: number | null;
  unit: string | null;
  isCompleted: boolean;
  completedAt: string | null;
}

@Entity('goal_plans')
export class GoalPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Goal, { onDelete: 'CASCADE' })
  goal: Goal;

  @Column()
  goalId: string;

  @Column()
  userId: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'int', default: 50 })
  feasibilityScore: number;

  @Column({ type: 'text' })
  feasibilityReason: string;

  @Column({ type: 'jsonb', default: '[]' })
  milestones: GoalMilestone[];

  @Column({ type: 'jsonb', default: '[]' })
  actionSteps: string[];

  @Column({ type: 'jsonb', default: '[]' })
  risks: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  generatedAt: Date;
}
