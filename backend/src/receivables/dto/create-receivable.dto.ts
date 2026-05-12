import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateReceivableDto {
  @IsString()
  @IsNotEmpty()
  borrowerName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  dateGiven: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
