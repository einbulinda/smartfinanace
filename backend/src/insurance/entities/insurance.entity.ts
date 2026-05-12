import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum InsuranceType {
  HEALTH = 'HEALTH',
  LIFE = 'LIFE',
  CAR = 'CAR',
  HOME = 'HOME',
  EDUCATION = 'EDUCATION',
  BUSINESS = 'BUSINESS',
  OTHER = 'OTHER',
}

export enum PremiumFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUALLY = 'ANNUALLY',
}

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('insurance_policies')
export class Insurance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string;

  @Column({ type: 'enum', enum: InsuranceType })
  type: InsuranceType;

  @Column({ type: 'varchar', nullable: true })
  policyNumber: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  coverageAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: toFloat })
  premiumAmount: number;

  @Column({ type: 'enum', enum: PremiumFrequency, default: PremiumFrequency.MONTHLY })
  premiumFrequency: PremiumFrequency;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'date', nullable: true })
  nextPaymentDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
