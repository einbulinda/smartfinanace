import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { MakePaymentDto } from './dto/make-payment.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../transactions/entities/transaction.entity';

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt)
    private readonly repo: Repository<Debt>,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(userId: string, dto: CreateDebtDto): Promise<Debt> {
    const debt = this.repo.create({
      ...dto,
      userId,
      currentBalance: dto.currentBalance ?? dto.originalAmount,
      interestRate: dto.interestRate ?? 0,
    });
    return this.repo.save(debt);
  }

  async findAll(userId: string): Promise<Debt[]> {
    return this.repo.find({
      where: { userId },
      order: { interestRate: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Debt> {
    const debt = await this.repo.findOne({ where: { id, userId } });
    if (!debt) throw new NotFoundException('Debt not found');
    return debt;
  }

  async update(userId: string, id: string, dto: UpdateDebtDto): Promise<Debt> {
    const debt = await this.findOne(userId, id);
    Object.assign(debt, dto);
    return this.repo.save(debt);
  }

  async remove(userId: string, id: string): Promise<void> {
    const debt = await this.findOne(userId, id);
    await this.repo.remove(debt);
  }

  async makePayment(userId: string, id: string, dto: MakePaymentDto): Promise<Debt> {
    const debt = await this.findOne(userId, id);

    debt.currentBalance = Math.max(0, debt.currentBalance - dto.amount);
    if (debt.currentBalance === 0) debt.isPaidOff = true;

    // Record as an expense so it appears in transaction history and summary
    await this.transactionsService.create(userId, {
      type: TransactionType.EXPENSE,
      amount: dto.amount,
      category: 'debt_repayment',
      description: `Payment: ${debt.name}`,
      date: new Date().toISOString().split('T')[0],
      ...(dto.accountId ? { accountId: dto.accountId } : {}),
    });

    return this.repo.save(debt);
  }

  async getUpcomingPayments(userId: string): Promise<Debt[]> {
    const today = new Date().getDate();
    const next7 = Array.from({ length: 7 }, (_, i) => ((today + i - 1) % 31) + 1);
    const debts = await this.repo.find({ where: { userId, isPaidOff: false } });
    return debts.filter((d) => d.dueDate !== null && next7.includes(d.dueDate));
  }

  async getTotalDebt(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.currentBalance), 0)', 'total')
      .where('d.userId = :userId', { userId })
      .andWhere('d.isPaidOff = false')
      .getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }
}
