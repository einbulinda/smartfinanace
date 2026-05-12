import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DebtType, InterestType, DeductionMethod } from '../entities/debt.entity';

export class CreateDebtDto {
  @ApiProperty({ example: 'KCB Personal Loan' })
  @IsString()
  name: string;

  @ApiProperty({ enum: DebtType })
  @IsEnum(DebtType)
  type: DebtType;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  @IsPositive()
  originalAmount: number;

  @ApiPropertyOptional({ example: 500000, description: 'Defaults to originalAmount if omitted' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentBalance?: number;

  @ApiPropertyOptional({ example: 14.5, description: 'Annual rate as %. Default 0 for informal debts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @ApiPropertyOptional({ enum: InterestType, description: 'How interest is calculated' })
  @IsOptional()
  @IsEnum(InterestType)
  interestType?: InterestType;

  @ApiPropertyOptional({ enum: DeductionMethod, description: 'How payments are collected' })
  @IsOptional()
  @IsEnum(DeductionMethod)
  deductionMethod?: DeductionMethod;

  @ApiPropertyOptional({ example: 'KCB Bank', description: 'Free-text lender type or name' })
  @IsOptional()
  @IsString()
  lenderType?: string;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  minimumPayment?: number;

  @ApiPropertyOptional({ example: 28, description: 'Day of month payment is due (1–31)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDate?: number;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2028-01-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
