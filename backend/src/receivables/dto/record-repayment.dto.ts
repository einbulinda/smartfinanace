import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordRepaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  accountId?: string;
}
