import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { AssetType } from '../entities/manual-asset.entity';

export class CreateManualAssetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  @IsNumber()
  @IsPositive()
  currentValue: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  purchaseValue?: number;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
