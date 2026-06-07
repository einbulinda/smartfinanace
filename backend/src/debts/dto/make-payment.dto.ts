import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { DebtPaymentType } from '../entities/debt-payment.entity';

export class MakePaymentDto {
  @ApiProperty({ example: 15000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Account to deduct payment from' })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiPropertyOptional({ enum: DebtPaymentType })
  @IsOptional()
  @IsEnum(DebtPaymentType)
  paymentType?: DebtPaymentType;
}
