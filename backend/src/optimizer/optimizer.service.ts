import { BadRequestException, Injectable } from '@nestjs/common';
import { DebtsService } from '../debts/debts.service';
import { InterestType, DeductionMethod } from '../debts/entities/debt.entity';
import { OptimizationStrategy } from './dto/optimize-request.dto';

interface DebtState {
  id: string;
  name: string;
  balance: number;
  originalAmount: number;
  annualRate: number;
  interestType: InterestType;
  minimumPayment: number;
}

interface MonthBreakdown {
  id: string;
  name: string;
  interest: number;
  payment: number;
  balance: number;
}

interface MonthlySnapshot {
  month: number;
  totalRemaining: number;
  breakdown: MonthBreakdown[];
}

interface SimulationResult {
  totalMonths: number;
  totalInterestPaid: number;
  schedule: MonthlySnapshot[];
}

export interface OptimizationResult {
  strategy: string;
  monthlyBudget: number;
  totalMonths: number;
  totalInterestPaid: number;
  debtFreeDate: string;
  interestSaved: number;
  monthsSaved: number;
  schedule: MonthlySnapshot[];
}

@Injectable()
export class OptimizerService {
  constructor(private readonly debtsService: DebtsService) {}

  private r(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private monthlyInterest(d: DebtState): number {
    switch (d.interestType) {
      case InterestType.FLAT_RATE:
        // Interest charged on the original principal throughout the loan
        return this.r(d.originalAmount * (d.annualRate / 100 / 12));
      case InterestType.DAILY_ACCRUAL:
        // Approximate: daily rate × 30 days
        return this.r(d.balance * (d.annualRate / 100 / 365) * 30);
      case InterestType.NONE:
        return 0;
      default:
        // REDUCING_BALANCE: interest on current outstanding balance
        return this.r(d.balance * (d.annualRate / 100 / 12));
    }
  }

  private runSimulation(
    debts: DebtState[],
    monthlyBudget: number,
    strategy: OptimizationStrategy | 'MINIMUM_ONLY',
  ): SimulationResult {
    const state = debts.map((d) => ({ ...d, balance: Math.max(0, d.balance) }));
    const totalMinimums = state.reduce((s, d) => s + d.minimumPayment, 0);

    if (monthlyBudget < totalMinimums) {
      throw new BadRequestException(
        `Monthly budget (${monthlyBudget}) is less than total minimum payments (${totalMinimums})`,
      );
    }

    const schedule: MonthlySnapshot[] = [];
    let totalInterestPaid = 0;
    let month = 0;
    const MAX_MONTHS = 360;

    while (state.some((d) => d.balance > 0.005) && month < MAX_MONTHS) {
      month++;
      const interestMap: Record<string, number> = {};
      const paymentMap: Record<string, number> = {};

      for (const d of state) {
        paymentMap[d.id] = 0;
      }

      // Step 1: accrue interest on each active debt using its specific interest type
      for (const d of state) {
        if (d.balance <= 0.005) { interestMap[d.id] = 0; continue; }
        const interest = this.monthlyInterest(d);
        interestMap[d.id] = interest;
        d.balance = this.r(d.balance + interest);
        totalInterestPaid = this.r(totalInterestPaid + interest);
      }

      // Step 2: sort active debts by strategy priority
      const active = state
        .filter((d) => d.balance > 0.005)
        .sort((a, b) => {
          if (strategy === OptimizationStrategy.AVALANCHE) return b.annualRate - a.annualRate;
          if (strategy === OptimizationStrategy.SNOWBALL) return a.balance - b.balance;
          return 0;
        });

      // Step 3: pay minimums across all active debts
      let remaining = monthlyBudget;
      for (const d of active) {
        const pay = this.r(Math.min(d.minimumPayment, d.balance, remaining));
        paymentMap[d.id] = pay;
        d.balance = this.r(d.balance - pay);
        remaining = this.r(remaining - pay);
      }

      // Step 4: put all remaining budget toward the top-priority debt
      if (strategy !== 'MINIMUM_ONLY' && remaining > 0.005) {
        for (const d of active) {
          if (d.balance > 0.005) {
            const extra = this.r(Math.min(remaining, d.balance));
            paymentMap[d.id] = this.r(paymentMap[d.id] + extra);
            d.balance = this.r(d.balance - extra);
            remaining = this.r(remaining - extra);
            break;
          }
        }
      }

      const totalRemaining = this.r(state.reduce((s, d) => s + Math.max(0, d.balance), 0));

      schedule.push({
        month,
        totalRemaining,
        breakdown: state.map((d) => ({
          id: d.id,
          name: d.name,
          interest: interestMap[d.id] ?? 0,
          payment: paymentMap[d.id] ?? 0,
          balance: Math.max(0, this.r(d.balance)),
        })),
      });
    }

    return { totalMonths: month, totalInterestPaid: this.r(totalInterestPaid), schedule };
  }

  private toDebtStates(debts: Awaited<ReturnType<DebtsService['findAll']>>): DebtState[] {
    return debts
      .filter((d) => !d.isPaidOff && d.currentBalance > 0)
      // Exclude salary-deduction debts — they are handled automatically and should not be in the optimizer
      .filter((d) => d.deductionMethod !== DeductionMethod.SALARY_DEDUCTION)
      .map((d) => ({
        id: d.id,
        name: d.name,
        balance: d.currentBalance,
        originalAmount: d.originalAmount,
        annualRate: d.interestRate,
        interestType: d.interestType ?? InterestType.REDUCING_BALANCE,
        minimumPayment: d.minimumPayment ?? 0,
      }));
  }

  async calculate(
    userId: string,
    strategy: OptimizationStrategy,
    monthlyBudget: number,
  ): Promise<OptimizationResult> {
    const debts = await this.debtsService.findAll(userId);
    const inputs = this.toDebtStates(debts);

    if (inputs.length === 0) {
      throw new BadRequestException('No active debts to optimize');
    }

    const totalMinimums = inputs.reduce((s, d) => s + d.minimumPayment, 0);

    const baselineBudget = totalMinimums > 0 ? totalMinimums : monthlyBudget;
    const baseline = this.runSimulation(
      inputs.map((d) => ({ ...d })),
      baselineBudget,
      'MINIMUM_ONLY',
    );

    const optimized = this.runSimulation(inputs.map((d) => ({ ...d })), monthlyBudget, strategy);

    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + optimized.totalMonths);

    return {
      strategy,
      monthlyBudget,
      totalMonths: optimized.totalMonths,
      totalInterestPaid: optimized.totalInterestPaid,
      debtFreeDate: debtFreeDate.toISOString().split('T')[0],
      interestSaved: this.r(baseline.totalInterestPaid - optimized.totalInterestPaid),
      monthsSaved: baseline.totalMonths - optimized.totalMonths,
      schedule: optimized.schedule,
    };
  }

  async compare(
    userId: string,
    monthlyBudget: number,
  ): Promise<{ avalanche: OptimizationResult; snowball: OptimizationResult }> {
    const [avalanche, snowball] = await Promise.all([
      this.calculate(userId, OptimizationStrategy.AVALANCHE, monthlyBudget),
      this.calculate(userId, OptimizationStrategy.SNOWBALL, monthlyBudget),
    ]);
    return { avalanche, snowball };
  }
}
