import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { AccountTransfer } from './entities/account-transfer.entity';
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(AccountTransfer)
    private readonly transferRepo: Repository<AccountTransfer>,
    @InjectRepository(Transaction)
    private readonly txnRepo: Repository<Transaction>,
  ) {}

  async create(userId: string, dto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepo.create({ ...dto, userId });
    return this.accountRepo.save(account);
  }

  async findAll(userId: string): Promise<Account[]> {
    return this.accountRepo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async findOne(userId: string, id: string): Promise<Account> {
    const account = await this.accountRepo.findOne({ where: { id, userId } });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async update(userId: string, id: string, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(userId, id);
    Object.assign(account, dto);
    return this.accountRepo.save(account);
  }

  async remove(userId: string, id: string): Promise<void> {
    const account = await this.findOne(userId, id);
    await this.accountRepo.remove(account);
  }

  async computeBalance(accountId: string): Promise<number> {
    const account = await this.accountRepo.findOne({ where: { id: accountId } });
    if (!account) return 0;

    // Income and expense transactions tagged to this account
    const txnRows = await this.txnRepo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .where('t.accountId = :accountId', { accountId })
      .andWhere('t.type IN (:...types)', { types: [TransactionType.INCOME, TransactionType.EXPENSE] })
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string }>();

    const income = parseFloat(txnRows.find((r) => r.type === TransactionType.INCOME)?.total ?? '0');
    const expense = parseFloat(txnRows.find((r) => r.type === TransactionType.EXPENSE)?.total ?? '0');

    // Transfers in and out
    const transferRow = await this.transferRepo
      .createQueryBuilder('tr')
      .select('COALESCE(SUM(CASE WHEN tr."toAccountId" = :id THEN tr.amount ELSE 0 END), 0)', 'creditsIn')
      .addSelect('COALESCE(SUM(CASE WHEN tr."fromAccountId" = :id THEN tr.amount ELSE 0 END), 0)', 'debitsOut')
      .where('tr."fromAccountId" = :id OR tr."toAccountId" = :id', { id: accountId })
      .getRawOne<{ creditsIn: string; debitsOut: string }>();

    const transfersIn = parseFloat(transferRow?.creditsIn ?? '0');
    const transfersOut = parseFloat(transferRow?.debitsOut ?? '0');

    return account.initialBalance + income - expense + transfersIn - transfersOut;
  }

  async findAllWithBalances(userId: string) {
    const accounts = await this.findAll(userId);
    return Promise.all(
      accounts.map(async (a) => ({
        ...a,
        currentBalance: await this.computeBalance(a.id),
      })),
    );
  }

  async getTotalBalance(userId: string): Promise<number | null> {
    const count = await this.accountRepo.count({ where: { userId, isActive: true } });
    if (count === 0) return null;

    const accounts = await this.accountRepo.find({ where: { userId, isActive: true } });
    const balances = await Promise.all(accounts.map((a) => this.computeBalance(a.id)));
    return balances.reduce((s, b) => s + b, 0);
  }

  async createTransfer(userId: string, dto: CreateTransferDto): Promise<AccountTransfer> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.findOne(userId, dto.fromAccountId),
      this.findOne(userId, dto.toAccountId),
    ]);

    const transfer = this.transferRepo.create({ ...dto, userId });
    const saved = await this.transferRepo.save(transfer);

    // Create two transaction entries for visibility in transaction list
    await this.txnRepo.save([
      this.txnRepo.create({
        userId,
        type: TransactionType.TRANSFER,
        amount: dto.amount,
        category: 'Transfer',
        description: `To: ${toAccount.name}`,
        date: dto.date,
        accountId: dto.fromAccountId,
      }),
      this.txnRepo.create({
        userId,
        type: TransactionType.TRANSFER,
        amount: dto.amount,
        category: 'Transfer',
        description: `From: ${fromAccount.name}`,
        date: dto.date,
        accountId: dto.toAccountId,
      }),
    ]);

    return saved;
  }

  async getTransfers(userId: string): Promise<AccountTransfer[]> {
    return this.transferRepo.find({
      where: { userId },
      relations: ['fromAccount', 'toAccount'],
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }
}
