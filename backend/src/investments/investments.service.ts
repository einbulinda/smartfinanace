import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investment } from './entities/investment.entity';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment)
    private readonly repo: Repository<Investment>,
  ) {}

  async create(userId: string, dto: CreateInvestmentDto): Promise<Investment> {
    const inv = this.repo.create({ ...dto, userId });
    return this.repo.save(inv);
  }

  async findAll(userId: string): Promise<Investment[]> {
    return this.repo.find({
      where: { userId },
      order: { purchaseDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Investment> {
    const inv = await this.repo.findOne({ where: { id, userId } });
    if (!inv) throw new NotFoundException('Investment not found');
    return inv;
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto): Promise<Investment> {
    const inv = await this.findOne(userId, id);
    Object.assign(inv, dto);
    return this.repo.save(inv);
  }

  async remove(userId: string, id: string): Promise<void> {
    const inv = await this.findOne(userId, id);
    await this.repo.remove(inv);
  }

  async getTotalCurrentValue(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.currentValue), 0)', 'total')
      .where('i.userId = :userId', { userId })
      .getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }
}
