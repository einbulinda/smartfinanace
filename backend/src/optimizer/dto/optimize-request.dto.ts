import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';

export enum OptimizationStrategy {
  AVALANCHE = 'AVALANCHE',
  SNOWBALL = 'SNOWBALL',
}

export class OptimizeRequestDto {
  @ApiProperty({ enum: OptimizationStrategy })
  @IsEnum(OptimizationStrategy)
  strategy: OptimizationStrategy;

  @ApiProperty({ example: 40000, description: 'Total monthly budget for all debt repayments' })
  @IsNumber()
  @IsPositive()
  monthlyBudget: number;
}

export class CompareRequestDto {
  @ApiPropertyOptional({ example: 40000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  monthlyBudget?: number;
}
