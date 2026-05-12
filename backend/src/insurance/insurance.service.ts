import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insurance, PremiumFrequency } from './entities/insurance.entity';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';

@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(Insurance)
    private readonly repo: Repository<Insurance>,
  ) {}

  async create(userId: string, dto: CreateInsuranceDto): Promise<Insurance> {
    const policy = this.repo.create({ ...dto, userId });
    return this.repo.save(policy);
  }

  async findAll(userId: string): Promise<Insurance[]> {
    return this.repo.find({
      where: { userId },
      order: { isActive: 'DESC', startDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<Insurance> {
    const policy = await this.repo.findOne({ where: { id, userId } });
    if (!policy) throw new NotFoundException('Insurance policy not found');
    return policy;
  }

  async update(userId: string, id: string, dto: UpdateInsuranceDto): Promise<Insurance> {
    const policy = await this.findOne(userId, id);
    Object.assign(policy, dto);
    return this.repo.save(policy);
  }

  async remove(userId: string, id: string): Promise<void> {
    const policy = await this.findOne(userId, id);
    await this.repo.remove(policy);
  }

  async getMonthlyPremiumTotal(userId: string): Promise<number> {
    const policies = await this.repo.find({ where: { userId, isActive: true } });
    return policies.reduce((sum, p) => {
      const monthly =
        p.premiumFrequency === PremiumFrequency.MONTHLY
          ? p.premiumAmount
          : p.premiumFrequency === PremiumFrequency.QUARTERLY
          ? p.premiumAmount / 3
          : p.premiumAmount / 12; // ANNUALLY
      return sum + monthly;
    }, 0);
  }
}
