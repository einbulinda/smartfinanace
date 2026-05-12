import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const project = this.repo.create({
      ...dto,
      userId,
      description: dto.description ?? null,
      color: dto.color ?? null,
      budget: dto.budget ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
    });
    return this.repo.save(project);
  }

  async findAll(userId: string) {
    const projects = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const summaries = await this.txRepo
      .createQueryBuilder('t')
      .select('t.projectId', 'projectId')
      .addSelect('t.type', 'type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.userId = :userId', { userId })
      .andWhere('t.projectId IS NOT NULL')
      .groupBy('t.projectId')
      .addGroupBy('t.type')
      .getRawMany<{ projectId: string; type: string; total: string; cnt: string }>();

    return projects.map((p) => {
      const rows = summaries.filter((s) => s.projectId === p.id);
      const totalIncome = parseFloat(
        rows.find((r) => r.type === 'INCOME')?.total ?? '0',
      );
      const totalExpenses = parseFloat(
        rows.find((r) => r.type === 'EXPENSE')?.total ?? '0',
      );
      const transactionCount = rows.reduce((s, r) => s + parseInt(r.cnt), 0);
      return {
        ...p,
        totalIncome,
        totalExpenses,
        net: totalIncome - totalExpenses,
        transactionCount,
      };
    });
  }

  async findOne(userId: string, id: string) {
    const project = await this.repo.findOne({ where: { id, userId } });
    if (!project) throw new NotFoundException('Project not found');

    const rows = await this.txRepo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'cnt')
      .where('t.userId = :userId AND t.projectId = :projectId', { userId, projectId: id })
      .groupBy('t.type')
      .getRawMany<{ type: string; total: string; cnt: string }>();

    const totalIncome = parseFloat(rows.find((r) => r.type === 'INCOME')?.total ?? '0');
    const totalExpenses = parseFloat(rows.find((r) => r.type === 'EXPENSE')?.total ?? '0');
    const transactionCount = rows.reduce((s, r) => s + parseInt(r.cnt), 0);

    return { ...project, totalIncome, totalExpenses, net: totalIncome - totalExpenses, transactionCount };
  }

  async update(userId: string, id: string, dto: Partial<CreateProjectDto>): Promise<Project> {
    const project = await this.repo.findOne({ where: { id, userId } });
    if (!project) throw new NotFoundException('Project not found');
    Object.assign(project, dto);
    return this.repo.save(project);
  }

  async remove(userId: string, id: string): Promise<void> {
    const project = await this.repo.findOne({ where: { id, userId } });
    if (!project) throw new NotFoundException('Project not found');
    await this.repo.remove(project);
  }
}
