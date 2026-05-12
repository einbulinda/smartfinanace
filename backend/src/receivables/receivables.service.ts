import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receivable, ReceivableStatus } from './entities/receivable.entity';
import { ReceivableRepayment } from './entities/receivable-repayment.entity';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';
import { RecordRepaymentDto } from './dto/record-repayment.dto';

@Injectable()
export class ReceivablesService {
  constructor(
    @InjectRepository(Receivable)
    private readonly repo: Repository<Receivable>,
    @InjectRepository(ReceivableRepayment)
    private readonly repaymentRepo: Repository<ReceivableRepayment>,
  ) {}

  async create(userId: string, dto: CreateReceivableDto): Promise<Receivable> {
    const r = this.repo.create({ ...dto, userId, amountRepaid: 0, status: ReceivableStatus.OUTSTANDING });
    return this.repo.save(r);
  }

  async findAll(userId: string): Promise<Receivable[]> {
    return this.repo.find({
      where: { userId },
      relations: ['repayments'],
      order: { dateGiven: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Receivable> {
    const r = await this.repo.findOne({ where: { id, userId }, relations: ['repayments'] });
    if (!r) throw new NotFoundException('Receivable not found');
    return r;
  }

  async update(userId: string, id: string, dto: UpdateReceivableDto): Promise<Receivable> {
    const r = await this.findOne(userId, id);
    Object.assign(r, dto);
    return this.repo.save(r);
  }

  async remove(userId: string, id: string): Promise<void> {
    const r = await this.findOne(userId, id);
    await this.repo.remove(r);
  }

  async recordRepayment(userId: string, id: string, dto: RecordRepaymentDto): Promise<Receivable> {
    const r = await this.findOne(userId, id);

    const repayment = this.repaymentRepo.create({ ...dto, receivableId: id });
    await this.repaymentRepo.save(repayment);

    r.amountRepaid = Math.min(r.amount, r.amountRepaid + dto.amount);

    if (r.amountRepaid >= r.amount) {
      r.status = ReceivableStatus.REPAID;
    } else if (r.amountRepaid > 0) {
      r.status = ReceivableStatus.PARTIALLY_REPAID;
    }

    return this.repo.save(r);
  }

  async writeOff(userId: string, id: string): Promise<Receivable> {
    const r = await this.findOne(userId, id);
    r.status = ReceivableStatus.WRITTEN_OFF;
    return this.repo.save(r);
  }

  async getTotalOutstanding(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount - r.amountRepaid), 0)', 'total')
      .where('r.userId = :userId', { userId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [ReceivableStatus.OUTSTANDING, ReceivableStatus.PARTIALLY_REPAID],
      })
      .getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }
}
