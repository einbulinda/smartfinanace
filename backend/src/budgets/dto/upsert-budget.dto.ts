import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class BudgetItemDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  @Min(0)
  allocatedAmount: number;

  @IsBoolean()
  @IsOptional()
  isPreDeduction?: boolean;
}

export class UpsertBudgetDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}
