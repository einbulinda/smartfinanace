import { Injectable } from '@nestjs/common';
import { DebtsService } from '../debts/debts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AccountsService } from '../accounts/accounts.service';
import { InvestmentsService } from '../investments/investments.service';
import { ReceivablesService } from '../receivables/receivables.service';

export interface ProjectionMonth {
  month: number;
  year: number;
  cashFlow: number;
  debtPayments: number;
  netSavings: number;
  savings: number;
  totalDebt: number;
  netWorth: number;
}

export interface ProjectionResult {
  inputs: {
    monthlyIncome: number;
    monthlyExpense: number;
    monthlyCashFlow: number;
    totalDebt: number;
    initialNetWorth: number;
  };
  summary: {
    debtFreeDate: string | null;
    debtFreeMonths: number | null;
    projectedSavings: number;
    projectedNetWorth: number;
  };
  months: ProjectionMonth[];
}

@Injectable()
export class ProjectionService {
  constructor(
    private readonly debtsService: DebtsService,
    private readonly transactionsService: TransactionsService,
    private readonly accountsService: AccountsService,
    private readonly investmentsService: InvestmentsService,
    private readonly receivablesService: ReceivablesService,
  ) {}

  private r(n: number): number {
    return Math.round(n * 100) / 100;
  }

  async forecast(
    userId: string,
    horizonMonths: number,
    monthlyIncomeOverride?: number,
    monthlyExpenseOverride?: number,
  ): Promise<ProjectionResult> {
    const now = new Date();

    // Use last month's actuals as baseline income/expense
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const summary = await this.transactionsService.getSummary(
      userId,
      lastMonthDate.getMonth() + 1,
      lastMonthDate.getFullYear(),
    );

    const monthlyIncome = this.r(monthlyIncomeOverride ?? summary.income);
    const monthlyExpense = this.r(monthlyExpenseOverride ?? summary.expense);
    const monthlyCashFlow = this.r(monthlyIncome - monthlyExpense);

    // Load active debts
    const rawDebts = await this.debtsService.findAll(userId);
    const debts = rawDebts
      .filter((d) => !d.isPaidOff && Number(d.currentBalance) > 0)
      .map((d) => ({
        balance: this.r(Number(d.currentBalance)),
        annualRate: Number(d.interestRate),
        minimumPayment: Number(d.minimumPayment ?? 0),
      }));

    const totalDebt = this.r(debts.reduce((s, d) => s + d.balance, 0));

    // Compute true initial net worth from all asset sources
    const [accountBalance, totalInvestments, totalReceivables] = await Promise.all([
      this.accountsService.getTotalBalance(userId),
      this.investmentsService.getTotalCurrentValue(userId),
      this.receivablesService.getTotalOutstanding(userId),
    ]);

    // Non-debt assets: account balances (if any exist) + investments + receivables
    const initialNonDebtAssets = this.r((accountBalance ?? 0) + totalInvestments + totalReceivables);
    const initialNetWorth = this.r(initialNonDebtAssets - totalDebt);

    const months: ProjectionMonth[] = [];
    let savings = 0;
    let debtFreeMonths: number | null = totalDebt === 0 ? 0 : null;

    for (let i = 1; i <= horizonMonths; i++) {
      const projDate = new Date(now.getFullYear(), now.getMonth() + i, 1);

      // Accrue monthly interest on each active debt
      for (const d of debts) {
        if (d.balance < 0.005) continue;
        const interest = this.r(d.balance * (d.annualRate / 100 / 12));
        d.balance = this.r(d.balance + interest);
      }

      // Pay minimum (or full balance if smaller) on each debt
      let debtPayments = 0;
      for (const d of debts) {
        if (d.balance < 0.005) continue;
        const minPay = d.minimumPayment > 0 ? d.minimumPayment : d.balance;
        const pay = this.r(Math.min(minPay, d.balance));
        d.balance = this.r(d.balance - pay);
        debtPayments = this.r(debtPayments + pay);
      }

      const netSavings = this.r(monthlyCashFlow - debtPayments);
      savings = this.r(savings + netSavings);

      const totalRemainingDebt = this.r(
        debts.reduce((s, d) => s + Math.max(0, d.balance), 0),
      );
      // Net worth = starting non-debt assets + cumulative savings − remaining debt
      const netWorth = this.r(initialNonDebtAssets + savings - totalRemainingDebt);

      if (debtFreeMonths === null && totalRemainingDebt < 0.01 && totalDebt > 0) {
        debtFreeMonths = i;
      }

      months.push({
        month: projDate.getMonth() + 1,
        year: projDate.getFullYear(),
        cashFlow: monthlyCashFlow,
        debtPayments,
        netSavings,
        savings,
        totalDebt: totalRemainingDebt,
        netWorth,
      });
    }

    let debtFreeDate: string | null = null;
    if (debtFreeMonths !== null && debtFreeMonths > 0) {
      const dfDate = new Date(now.getFullYear(), now.getMonth() + debtFreeMonths, 1);
      debtFreeDate = `${dfDate.getFullYear()}-${String(dfDate.getMonth() + 1).padStart(2, '0')}`;
    } else if (debtFreeMonths === 0) {
      debtFreeDate = 'already';
    }

    const last = months[months.length - 1];

    return {
      inputs: {
        monthlyIncome,
        monthlyExpense,
        monthlyCashFlow,
        totalDebt,
        initialNetWorth,
      },
      summary: {
        debtFreeDate,
        debtFreeMonths,
        projectedSavings: last.savings,
        projectedNetWorth: last.netWorth,
      },
      months,
    };
  }
}
