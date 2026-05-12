import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { GoalType, GoalStatus } from '../entities/goal.entity';

export class CreateGoalDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(GoalType)
  type: GoalType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
