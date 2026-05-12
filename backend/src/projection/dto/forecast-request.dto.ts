import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export class ForecastRequestDto {
  @ApiProperty({ description: 'Projection horizon in months', enum: [12, 24, 36, 60] })
  @IsIn([12, 24, 36, 60])
  months: 12 | 24 | 36 | 60;

  @ApiPropertyOptional({ description: 'Override monthly income (defaults to last month actual)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyIncome?: number;

  @ApiPropertyOptional({ description: 'Override monthly expenses (defaults to last month actual)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyExpense?: number;
}
