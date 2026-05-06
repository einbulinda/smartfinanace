import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { RecurringFrequency, TransactionType } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'salary' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'Monthly salary' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ enum: RecurringFrequency })
  @ValidateIf((o: CreateTransactionDto) => o.isRecurring === true)
  @IsEnum(RecurringFrequency)
  recurringFrequency?: RecurringFrequency;
}
