import {
  Injectable,
  ServiceUnavailableException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { UserInsight, InsightItem } from './entities/user-insight.entity';
import { GoalsService } from '../goals/goals.service';
import { GoalPlan } from '../goals/entities/goal-plan.entity';

const SYSTEM_PROMPT = `You are a personal financial advisor for SmartFinance, a financial management app for users in Kenya. You give practical, data-driven, and empathetic advice in Kenyan Shillings (KES).

Your role:
- Analyse the user's actual financial data to generate actionable insights and realistic goal plans
- Always account for the Kenyan financial context (M-Pesa, SACCOs, chamas, informal lending, etc.)
- Be honest about feasibility — don't sugarcoat tight situations, but always offer a constructive path forward
- Output only valid JSON matching the exact schema requested — no extra commentary outside JSON`;

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(UserInsight) private readonly insightRepo: Repository<UserInsight>,
    @Inject(forwardRef(() => GoalsService)) private readonly goalsService: GoalsService,
  ) {}

  // ─── Insights ─────────────────────────────────────────────────────────────

  async getLatestInsights(userId: string): Promise<UserInsight | null> {
    return this.insightRepo.findOne({
      where: { userId },
      order: { generatedAt: 'DESC' },
    });
  }

  async generateInsights(userId: string, snapshot: FinancialSnapshot): Promise<UserInsight> {
    const client = this.ensureApiKey();

    const userMessage = `
Generate financial insights for this user based on their data:

Monthly Income (avg last 3 months): KES ${snapshot.avgMonthlyIncome.toLocaleString()}
Monthly Expenses (avg last 3 months): KES ${snapshot.avgMonthlyExpenses.toLocaleString()}
Monthly Net: KES ${snapshot.avgMonthlyNet.toLocaleString()}
Savings Rate: ${snapshot.savingsRate.toFixed(1)}%

Top Expense Categories: ${JSON.stringify(snapshot.topExpenseCategories)}

Total Debt: KES ${snapshot.totalDebt.toLocaleString()}
Total Investments: KES ${snapshot.totalInvestments.toLocaleString()}
Net Worth: KES ${snapshot.netWorth.toLocaleString()}
Active Goals: ${snapshot.goalsSummary}

Return a JSON object with this exact schema:
{
  "insights": [
    {
      "id": "<uuid-string>",
      "type": "warning" | "opportunity" | "info" | "celebration",
      "category": "cash_flow" | "debt" | "savings" | "investments" | "goals" | "general",
      "title": "<short title, max 8 words>",
      "body": "<2-3 sentences of concrete advice>",
      "action": "<single actionable step or null>",
      "priority": "high" | "medium" | "low"
    }
  ]
}

Generate 5 to 8 insights. Prioritise high-impact, specific advice. Use actual KES amounts from the data.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content.find((b) => b.type === 'text')?.text ?? '{}';
    const parsed = this.parseJson<{ insights: InsightItem[] }>(text);

    // deactivate previous cached
    await this.insightRepo.delete({ userId });

    const record = this.insightRepo.create({
      userId,
      insights: parsed.insights ?? [],
    });
    return this.insightRepo.save(record);
  }

  // ─── Goal Plan ────────────────────────────────────────────────────────────

  async generateGoalPlan(userId: string, goalId: string): Promise<GoalPlan> {
    this.ensureApiKey(); // validates key; client created per-call inside callPlanApi
    const goalData = await this.goalsService.findOne(userId, goalId);
    if (!goalData) throw new NotFoundException('Goal not found');

    const prompt = this.buildPlanPrompt(goalData, false);
    const planData = await this.callPlanApi(prompt);
    return this.goalsService.savePlan(userId, goalId, planData);
  }

  async reviewGoalPlan(userId: string, goalId: string): Promise<GoalPlan> {
    this.ensureApiKey(); // validates key; client created per-call inside callPlanApi
    const goalData = await this.goalsService.findOne(userId, goalId);
    if (!goalData) throw new NotFoundException('Goal not found');
    if (!goalData.plan) throw new NotFoundException('No active plan to review — generate one first');

    const prompt = this.buildPlanPrompt(goalData, true);
    const planData = await this.callPlanApi(prompt);
    return this.goalsService.savePlan(userId, goalId, planData);
  }

  private buildPlanPrompt(goalData: any, isReview: boolean): string {
    const { title, description, type, targetValue, currentValue, unit, startDate, targetDate, plan, progressStatus, progressPct } = goalData;

    const action = isReview ? 'Review and revise' : 'Create';
    const progressSection = isReview && plan
      ? `
Current Progress: ${progressPct}% (${progressStatus})
Current Milestones Completion:
${plan.milestones.map((m: any) => `  - ${m.title} (${m.targetDate}): ${m.isCompleted ? '✅ done' : '⬜ pending'}`).join('\n')}
`
      : '';

    return `
${action} a financial plan for this goal:

Title: ${title}
Type: ${type}
Description: ${description ?? 'None provided'}
Target: ${targetValue !== null ? `KES ${Number(targetValue).toLocaleString()} ${unit ?? ''}` : `Qualitative — ${unit ?? 'see description'}`}
Current Value: ${currentValue !== null ? `KES ${Number(currentValue).toLocaleString()} ${unit ?? ''}` : 'Not set'}
Start Date: ${startDate}
Target Date: ${targetDate}
${progressSection}
Return a JSON object with this exact schema:
{
  "summary": "<2-3 paragraph plan overview — practical and specific to Kenya>",
  "feasibilityScore": <integer 0-100>,
  "feasibilityReason": "<1-2 sentences explaining the score>",
  "milestones": [
    {
      "id": "<unique-string>",
      "title": "<milestone title>",
      "description": "<what to do at this milestone>",
      "targetDate": "<YYYY-MM-DD within start/target range>",
      "targetValue": <number or null>,
      "unit": "<unit string or null>",
      "isCompleted": false,
      "completedAt": null
    }
  ],
  "actionSteps": ["<step 1>", "<step 2>", ...],
  "risks": ["<risk 1>", "<risk 2>", ...]
}

Generate 4-6 milestones that span the full timeframe. Make actionSteps concrete and Kenya-specific. List 2-4 realistic risks.`;
  }

  private async callPlanApi(userMessage: string): Promise<Partial<GoalPlan>> {
    const client = this.ensureApiKey();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content.find((b) => b.type === 'text')?.text ?? '{}';
    return this.parseJson<Partial<GoalPlan>>(text);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private ensureApiKey(): Anthropic {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableException(
        'AI features require ANTHROPIC_API_KEY to be set in the environment.',
      );
    }
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  private parseJson<T>(text: string): T {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {} as T;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return {} as T;
    }
  }
}

export interface FinancialSnapshot {
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  avgMonthlyNet: number;
  savingsRate: number;
  topExpenseCategories: { category: string; amount: number }[];
  totalDebt: number;
  totalInvestments: number;
  netWorth: number;
  goalsSummary: string;
}
