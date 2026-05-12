import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualAsset } from './entities/manual-asset.entity';
import { CreateManualAssetDto } from './dto/create-manual-asset.dto';
import { UpdateManualAssetDto } from './dto/update-manual-asset.dto';

@Injectable()
export class ManualAssetsService {
  constructor(
    @InjectRepository(ManualAsset)
    private readonly repo: Repository<ManualAsset>,
  ) {}

  async create(userId: string, dto: CreateManualAssetDto): Promise<ManualAsset> {
    const asset = this.repo.create({
      ...dto,
      userId,
      purchaseValue: dto.purchaseValue ?? dto.currentValue,
    });
    return this.repo.save(asset);
  }

  async findAll(userId: string): Promise<ManualAsset[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async findOne(userId: string, id: string): Promise<ManualAsset> {
    const asset = await this.repo.findOne({ where: { id, userId } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(userId: string, id: string, dto: UpdateManualAssetDto): Promise<ManualAsset> {
    const asset = await this.findOne(userId, id);
    Object.assign(asset, dto);
    return this.repo.save(asset);
  }

  async remove(userId: string, id: string): Promise<void> {
    const asset = await this.findOne(userId, id);
    await this.repo.remove(asset);
  }

  async getTotalValue(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.currentValue), 0)', 'total')
      .where('a.userId = :userId', { userId })
      .getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }
}
