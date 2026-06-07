import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Insurance } from './insurance.entity';

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('insurance_payments')
export class InsurancePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  policyId: string;

  @ManyToOne(() => Insurance, { onDelete: 'CASCADE' })
  policy: Insurance;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: toFloat })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn()
  createdAt: Date;
}
