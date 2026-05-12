import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { InsuranceType, PremiumFrequency } from '../entities/insurance.entity';

export class CreateInsuranceDto {
  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty({ enum: InsuranceType })
  @IsEnum(InsuranceType)
  type: InsuranceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  policyNumber?: string;

  @ApiProperty({ example: 1000000 })
  @IsNumber()
  @Min(0)
  coverageAmount: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  premiumAmount: number;

  @ApiProperty({ enum: PremiumFrequency, default: PremiumFrequency.MONTHLY })
  @IsEnum(PremiumFrequency)
  premiumFrequency: PremiumFrequency;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  nextPaymentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
