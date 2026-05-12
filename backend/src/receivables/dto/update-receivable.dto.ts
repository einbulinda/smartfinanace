import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateReceivableDto } from './create-receivable.dto';
import { ReceivableStatus } from '../entities/receivable.entity';

export class UpdateReceivableDto extends PartialType(CreateReceivableDto) {
  @IsEnum(ReceivableStatus)
  @IsOptional()
  status?: ReceivableStatus;
}
