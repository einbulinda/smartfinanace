import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class MakePaymentDto {
  @ApiProperty({ example: 15000 })
  @IsNumber()
  @IsPositive()
  amount: number;
}
