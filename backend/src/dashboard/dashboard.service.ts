import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { DebtsService } from '../debts/debts.service';
import { TransactionType } from '../transactions/entities/transaction.entity';

@Injectable()
export class DashboardService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly debtsService: DebtsService,
  ) {}

  async getNetWorth(userId: string) {
    const [{ totalIncome, totalExpenses }, totalDebt] = await Promise.all([
      this.transactionsService.getAllTimeTotals(userId),
      this.debtsService.getTotalDebt(userId),
    ]);

    const assets = totalIncome - totalExpenses;
    const netWorth = assets - totalDebt;

    return {
      netWorth,
      assets,
      liabilities: totalDebt,
      breakdown: { totalIncome, totalExpenses },
    };
  }

  async getMonthlyOverview(userId: string, month: number, year: number) {
    const [summary, upcomingPayments, totalDebt] = await Promise.all([
      this.transactionsService.getSummary(userId, month, year),
      this.debtsService.getUpcomingPayments(userId),
      this.debtsService.getTotalDebt(userId),
    ]);

    const top5Expenses = summary.categoryBreakdown
      .filter((c) => c.type === TransactionType.EXPENSE)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      month,
      year,
      income: summary.income,
      expense: summary.expense,
      net: summary.net,
      top5Expenses,
      upcomingPayments,
      totalDebt,
    };
  }

  async getFinancialSnapshot(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [currentSummary, lastSummary, netWorthData, totalDebt] = await Promise.all([
      this.transactionsService.getSummary(userId, currentMonth, currentYear),
      this.transactionsService.getSummary(userId, lastMonth, lastMonthYear),
      this.getNetWorth(userId),
      this.debtsService.getTotalDebt(userId),
    ]);

    return {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        income: currentSummary.income,
        expense: currentSummary.expense,
        net: currentSummary.net,
      },
      lastMonth: {
        month: lastMonth,
        year: lastMonthYear,
        income: lastSummary.income,
        expense: lastSummary.expense,
        net: lastSummary.net,
      },
      netWorth: netWorthData.netWorth,
      // Positive = net worth growing vs last month; negative = shrinking
      netWorthChange: currentSummary.net - lastSummary.net,
      totalDebt,
    };
  }
}
