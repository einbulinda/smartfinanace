import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Debt } from './debt.entity';

export enum DebtPaymentType {
  MANUAL = 'MANUAL',
  SALARY_DEDUCTION = 'SALARY_DEDUCTION',
  AUTO_DEBIT = 'AUTO_DEBIT',
  EXTRA = 'EXTRA',
}

const toFloat = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v ?? '0'),
};

@Entity('debt_payments')
export class DebtPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  debtId: string;

  @ManyToOne(() => Debt, { onDelete: 'CASCADE' })
  debt: Debt;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: toFloat })
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: DebtPaymentType, default: DebtPaymentType.MANUAL })
  type: DebtPaymentType;

  @CreateDateColumn()
  createdAt: Date;
}
