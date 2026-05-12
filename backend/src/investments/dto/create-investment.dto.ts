import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InvestmentType } from '../entities/investment.entity';

export class CreateInvestmentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: InvestmentType })
  @IsEnum(InvestmentType)
  type: InvestmentType;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  amountInvested: number;

  @ApiProperty({ example: 62000 })
  @IsNumber()
  @Min(0)
  currentValue: number;

  @ApiProperty({ example: '2025-01-15' })
  @IsDateString()
  purchaseDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
