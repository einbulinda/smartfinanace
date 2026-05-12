import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal, GoalStatus } from './entities/goal.entity';
import { GoalPlan, GoalMilestone } from './entities/goal-plan.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

export type ProgressStatus = 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'ACHIEVED' | 'NO_PLAN';

export interface GoalWithStatus extends Goal {
  plan: GoalPlan | null;
  progressStatus: ProgressStatus;
  progressPct: number;
  daysRemaining: number;
}

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal) private readonly goalRepo: Repository<Goal>,
    @InjectRepository(GoalPlan) private readonly planRepo: Repository<GoalPlan>,
  ) {}

  async create(userId: string, dto: CreateGoalDto): Promise<Goal> {
    const goal = this.goalRepo.create({ ...dto, userId });
    return this.goalRepo.save(goal);
  }

  async findAll(userId: string): Promise<GoalWithStatus[]> {
    const goals = await this.goalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const plans = await this.planRepo.find({
      where: { userId, isActive: true },
    });
    const planByGoal = new Map(plans.map((p) => [p.goalId, p]));
    return goals.map((g) => this.attachStatus(g, planByGoal.get(g.id) ?? null));
  }

  async findOne(userId: string, id: string): Promise<GoalWithStatus> {
    const goal = await this.goalRepo.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    const plan = await this.planRepo.findOne({ where: { goalId: id, isActive: true } });
    return this.attachStatus(goal, plan ?? null);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto): Promise<Goal> {
    const goal = await this.goalRepo.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    Object.assign(goal, dto);
    return this.goalRepo.save(goal);
  }

  async remove(userId: string, id: string): Promise<void> {
    const goal = await this.goalRepo.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    await this.goalRepo.remove(goal);
  }

  async updateProgress(userId: string, id: string, value: number): Promise<GoalWithStatus> {
    const goal = await this.goalRepo.findOne({ where: { id, userId } });
    if (!goal) throw new NotFoundException('Goal not found');
    goal.currentValue = value;
    if (goal.targetValue !== null && value >= goal.targetValue) {
      goal.status = GoalStatus.ACHIEVED;
    }
    await this.goalRepo.save(goal);
    const plan = await this.planRepo.findOne({ where: { goalId: id, isActive: true } });
    return this.attachStatus(goal, plan ?? null);
  }

  async savePlan(userId: string, goalId: string, planData: Partial<GoalPlan>): Promise<GoalPlan> {
    // deactivate any existing active plan
    await this.planRepo.update({ goalId, isActive: true }, { isActive: false });
    const plan = this.planRepo.create({ ...planData, goalId, userId, isActive: true });
    return this.planRepo.save(plan);
  }

  async toggleMilestone(
    userId: string,
    goalId: string,
    milestoneId: string,
    isCompleted: boolean,
  ): Promise<GoalPlan> {
    const plan = await this.planRepo.findOne({ where: { goalId, userId, isActive: true } });
    if (!plan) throw new NotFoundException('Active plan not found');

    plan.milestones = plan.milestones.map((m): GoalMilestone => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString().split('T')[0] : null,
      };
    });
    return this.planRepo.save(plan);
  }

  // ─── Progress computation ─────────────────────────────────────────────────

  private attachStatus(goal: Goal, plan: GoalPlan | null): GoalWithStatus {
    if (goal.status === GoalStatus.ACHIEVED) {
      return { ...goal, plan, progressStatus: 'ACHIEVED', progressPct: 100, daysRemaining: 0 };
    }

    const today = new Date();
    const start = new Date(goal.startDate);
    const target = new Date(goal.targetDate);
    const daysRemaining = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
    const totalDays = Math.max(1, (target.getTime() - start.getTime()) / 86_400_000);
    const elapsedFraction = Math.min(1, Math.max(0, (today.getTime() - start.getTime()) / (target.getTime() - start.getTime())));

    let progressStatus: ProgressStatus = 'NO_PLAN';
    let progressPct = 0;

    if (goal.targetValue !== null && goal.currentValue !== null && goal.targetValue > 0) {
      // Quantitative
      progressPct = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
      const expectedPct = elapsedFraction * 100;
      const delta = progressPct - expectedPct;
      const threshold = 10; // 10 percentage points
      progressStatus = delta >= threshold ? 'AHEAD' : delta >= -threshold ? 'ON_TRACK' : 'BEHIND';
    } else if (plan && plan.milestones.length > 0) {
      // Qualitative — milestone completion vs due milestones
      const total = plan.milestones.length;
      const completed = plan.milestones.filter((m) => m.isCompleted).length;
      const due = plan.milestones.filter((m) => new Date(m.targetDate) <= today).length;
      progressPct = Math.round((completed / total) * 100);
      const expectedRate = due / total;
      const actualRate = completed / total;
      const delta = actualRate - expectedRate;
      progressStatus = delta >= 0.1 ? 'AHEAD' : delta >= -0.1 ? 'ON_TRACK' : 'BEHIND';
    } else if (plan) {
      progressStatus = 'ON_TRACK';
    }

    return { ...goal, plan, progressStatus, progressPct, daysRemaining };
  }
}
