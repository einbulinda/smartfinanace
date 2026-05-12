import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from './entities/budget.entity';
import { BudgetItem } from './entities/budget-item.entity';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../transactions/entities/transaction.entity';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly repo: Repository<Budget>,
    @InjectRepository(BudgetItem)
    private readonly itemRepo: Repository<BudgetItem>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async upsert(userId: string, month: string, dto: UpsertBudgetDto): Promise<Budget> {
    let budget = await this.repo.findOne({ where: { userId, month }, relations: ['items'] });

    if (budget) {
      await this.itemRepo.delete({ budgetId: budget.id });
    } else {
      budget = this.repo.create({ userId, month });
      budget = await this.repo.save(budget);
    }

    const items = dto.items.map((item) =>
      this.itemRepo.create({ ...item, budgetId: budget!.id }),
    );
    await this.itemRepo.save(items);

    return this.repo.findOne({ where: { id: budget.id }, relations: ['items'] }) as Promise<Budget>;
  }

  async findByMonth(userId: string, month: string): Promise<Budget | null> {
    return this.repo.findOne({ where: { userId, month }, relations: ['items'] });
  }

  async copyFromMonth(userId: string, targetMonth: string, sourceMonth: string): Promise<Budget> {
    const source = await this.repo.findOne({ where: { userId, month: sourceMonth }, relations: ['items'] });
    if (!source) throw new NotFoundException(`No budget found for ${sourceMonth}`);

    return this.upsert(userId, targetMonth, { items: source.items.map((i) => ({
      category: i.category,
      allocatedAmount: i.allocatedAmount,
      isPreDeduction: i.isPreDeduction,
    })) });
  }

  async getVsActual(userId: string, month: string) {
    const [year, mon] = month.split('-').map(Number);
    const budget = await this.findByMonth(userId, month);
    const summary = await this.transactionsService.getSummary(userId, mon, year);

    const actualByCategory = new Map<string, number>();
    for (const row of summary.categoryBreakdown) {
      if (row.type === TransactionType.EXPENSE) {
        actualByCategory.set(row.category, (actualByCategory.get(row.category) ?? 0) + row.total);
      }
    }

    const totalBudgeted = budget?.items.reduce((s, i) => s + i.allocatedAmount, 0) ?? 0;
    const totalActual = summary.expense;

    const items = (budget?.items ?? []).map((item) => {
      const actual = actualByCategory.get(item.category) ?? 0;
      return {
        category: item.category,
        allocated: item.allocatedAmount,
        actual,
        variance: item.allocatedAmount - actual,
        isPreDeduction: item.isPreDeduction,
      };
    });

    // Include categories with spend but no budget allocation
    for (const [category, actual] of actualByCategory) {
      if (!items.find((i) => i.category === category)) {
        items.push({ category, allocated: 0, actual, variance: -actual, isPreDeduction: false });
      }
    }

    return {
      month,
      totalBudgeted,
      totalActual,
      totalVariance: totalBudgeted - totalActual,
      income: summary.income,
      items: items.sort((a, b) => b.actual - a.actual),
    };
  }
}
