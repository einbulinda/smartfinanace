import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const t = this.repo.create({ ...dto, userId });
    return this.repo.save(t);
  }

  async findAll(userId: string, query: QueryTransactionDto) {
    const { type, category, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.repo
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) qb.andWhere('t.type = :type', { type });
    if (category) qb.andWhere('t.category = :category', { category });
    if (startDate) qb.andWhere('t.date >= :startDate', { startDate });
    if (endDate) qb.andWhere('t.date <= :endDate', { endDate });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string): Promise<Transaction> {
    const t = await this.repo.findOne({ where: { id, userId } });
    if (!t) throw new NotFoundException('Transaction not found');
    return t;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    const t = await this.findOne(userId, id);
    Object.assign(t, dto);
    return this.repo.save(t);
  }

  async remove(userId: string, id: string): Promise<void> {
    const t = await this.findOne(userId, id);
    await this.repo.remove(t);
  }

  async getAllTimeTotals(userId: string): Promise<{ totalIncome: number; totalExpenses: number }> {
    const rows = await this.repo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.userId = :userId', { userId })
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string }>();

    return {
      totalIncome: parseFloat(rows.find((r) => r.type === TransactionType.INCOME)?.total ?? '0'),
      totalExpenses: parseFloat(rows.find((r) => r.type === TransactionType.EXPENSE)?.total ?? '0'),
    };
  }

  async getSummary(userId: string, month: number, year: number) {
    const rows = await this.repo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('t.category', 'category')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.userId = :userId', { userId })
      .andWhere('EXTRACT(MONTH FROM t.date::date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM t.date::date) = :year', { year })
      .groupBy('t.type')
      .addGroupBy('t.category')
      .getRawMany<{ type: string; category: string; total: string }>();

    const income = rows
      .filter((r) => r.type === TransactionType.INCOME)
      .reduce((sum, r) => sum + parseFloat(r.total), 0);

    const expense = rows
      .filter((r) => r.type === TransactionType.EXPENSE)
      .reduce((sum, r) => sum + parseFloat(r.total), 0);

    return {
      month,
      year,
      income,
      expense,
      net: income - expense,
      categoryBreakdown: rows.map((r) => ({
        type: r.type,
        category: r.category,
        total: parseFloat(r.total),
      })),
    };
  }
}
