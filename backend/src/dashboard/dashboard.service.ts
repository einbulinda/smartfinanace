import { Injectable } from '@nestjs/common';
import { TransactionsService } from '../transactions/transactions.service';
import { DebtsService } from '../debts/debts.service';
import { InvestmentsService } from '../investments/investments.service';
import { InsuranceService } from '../insurance/insurance.service';
import { ReceivablesService } from '../receivables/receivables.service';
import { AccountsService } from '../accounts/accounts.service';
import { ManualAssetsService } from '../manual-assets/manual-assets.service';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { ReceivableStatus } from '../receivables/entities/receivable.entity';

export interface Alert {
  type: 'DEBT_DUE' | 'INSURANCE_DUE' | 'RECEIVABLE_DUE' | 'RECEIVABLE_OVERDUE';
  severity: 'warning' | 'info';
  title: string;
  message: string;
  daysUntilDue: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly debtsService: DebtsService,
    private readonly investmentsService: InvestmentsService,
    private readonly insuranceService: InsuranceService,
    private readonly receivablesService: ReceivablesService,
    private readonly accountsService: AccountsService,
    private readonly manualAssetsService: ManualAssetsService,
  ) {}

  async getNetWorth(userId: string) {
    const [{ totalIncome, totalExpenses }, totalDebt, totalInvestments, totalReceivables, totalAccountBalance, totalManualAssets] =
      await Promise.all([
        this.transactionsService.getAllTimeTotals(userId),
        this.debtsService.getTotalDebt(userId),
        this.investmentsService.getTotalCurrentValue(userId),
        this.receivablesService.getTotalOutstanding(userId),
        this.accountsService.getTotalBalance(userId),
        this.manualAssetsService.getTotalValue(userId),
      ]);

    // If user has accounts, use account balances as cash position; otherwise fall back to transaction totals
    const cashPosition = totalAccountBalance ?? (totalIncome - totalExpenses);
    const netWorth = cashPosition + totalInvestments + totalReceivables + totalManualAssets - totalDebt;

    return {
      netWorth,
      cashPosition,
      totalInvestments,
      totalReceivables,
      totalManualAssets,
      hasAccounts: totalAccountBalance !== null,
      liabilities: totalDebt,
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

    const [currentSummary, lastSummary, netWorthData, totalDebt, totalInvestments, monthlyInsuranceCost, totalReceivables, totalManualAssets] =
      await Promise.all([
        this.transactionsService.getSummary(userId, currentMonth, currentYear),
        this.transactionsService.getSummary(userId, lastMonth, lastMonthYear),
        this.getNetWorth(userId),
        this.debtsService.getTotalDebt(userId),
        this.investmentsService.getTotalCurrentValue(userId),
        this.insuranceService.getMonthlyPremiumTotal(userId),
        this.receivablesService.getTotalOutstanding(userId),
        this.manualAssetsService.getTotalValue(userId),
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
      netWorthChange: currentSummary.net - lastSummary.net,
      totalDebt,
      totalInvestments,
      totalReceivables,
      totalManualAssets,
      monthlyInsuranceCost: Math.round(monthlyInsuranceCost * 100) / 100,
    };
  }

  async getAnnualTrends(userId: string, year: number) {
    const months = await Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map((month) =>
        this.transactionsService.getSummary(userId, month, year).then((s) => ({
          month,
          year,
          income: s.income,
          expense: s.expense,
          net: s.net,
        })),
      ),
    );
    return { year, months };
  }

  async getAlerts(userId: string): Promise<Alert[]> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];
    const currentDayOfMonth = today.getDate();

    const [upcomingDebts, allInsurance, allReceivables] = await Promise.all([
      this.debtsService.getUpcomingPayments(userId),
      this.insuranceService.findAll(userId),
      this.receivablesService.findAll(userId),
    ]);

    const alerts: Alert[] = [];

    for (const debt of upcomingDebts) {
      let daysLeft = debt.dueDate !== null ? debt.dueDate - currentDayOfMonth : 0;
      if (daysLeft < 0) daysLeft += 31; // crossed month boundary
      const minPay = debt.minimumPayment ? `KES ${Number(debt.minimumPayment).toLocaleString()}` : 'Payment';
      alerts.push({
        type: 'DEBT_DUE',
        severity: daysLeft <= 2 ? 'warning' : 'info',
        title: `Debt due: ${debt.name}`,
        message: `${minPay} due on day ${debt.dueDate} of this month`,
        daysUntilDue: daysLeft,
      });
    }

    for (const policy of allInsurance) {
      if (!policy.isActive || !policy.nextPaymentDate) continue;
      if (policy.nextPaymentDate >= todayStr && policy.nextPaymentDate <= in7DaysStr) {
        const daysLeft = Math.ceil(
          (new Date(policy.nextPaymentDate).getTime() - today.getTime()) / 86400000,
        );
        alerts.push({
          type: 'INSURANCE_DUE',
          severity: daysLeft <= 2 ? 'warning' : 'info',
          title: `Insurance due: ${policy.provider}`,
          message: `KES ${Number(policy.premiumAmount).toLocaleString()} due on ${policy.nextPaymentDate}`,
          daysUntilDue: daysLeft,
        });
      }
    }

    for (const receivable of allReceivables) {
      if (!receivable.dueDate) continue;
      if (
        receivable.status === ReceivableStatus.REPAID ||
        receivable.status === ReceivableStatus.WRITTEN_OFF
      )
        continue;

      const outstanding = Number(receivable.amount) - Number(receivable.amountRepaid);

      if (receivable.dueDate < todayStr) {
        const daysOverdue = Math.ceil(
          (today.getTime() - new Date(receivable.dueDate).getTime()) / 86400000,
        );
        alerts.push({
          type: 'RECEIVABLE_OVERDUE',
          severity: 'warning',
          title: `Overdue: ${receivable.borrowerName}`,
          message: `KES ${outstanding.toLocaleString()} overdue by ${daysOverdue} day(s)`,
          daysUntilDue: -daysOverdue,
        });
      } else if (receivable.dueDate <= in7DaysStr) {
        const daysLeft = Math.ceil(
          (new Date(receivable.dueDate).getTime() - today.getTime()) / 86400000,
        );
        alerts.push({
          type: 'RECEIVABLE_DUE',
          severity: 'info',
          title: `Loan due soon: ${receivable.borrowerName}`,
          message: `KES ${outstanding.toLocaleString()} due on ${receivable.dueDate}`,
          daysUntilDue: daysLeft,
        });
      }
    }

    return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }
}
