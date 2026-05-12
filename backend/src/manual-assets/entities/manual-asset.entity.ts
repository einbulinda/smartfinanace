import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AssetType {
  VEHICLE = 'VEHICLE',
  REAL_ESTATE = 'REAL_ESTATE',
  ELECTRONICS = 'ELECTRONICS',
  FURNITURE = 'FURNITURE',
  JEWELRY = 'JEWELRY',
  OTHER = 'OTHER',
}

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('manual_assets')
export class ManualAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AssetType, default: AssetType.OTHER })
  type: AssetType;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: toFloat })
  currentValue: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0, transformer: toFloat })
  purchaseValue: number;

  @Column({ type: 'date' })
  purchaseDate: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
