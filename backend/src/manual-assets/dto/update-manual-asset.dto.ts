import { PartialType } from '@nestjs/swagger';
import { CreateManualAssetDto } from './create-manual-asset.dto';

export class UpdateManualAssetDto extends PartialType(CreateManualAssetDto) {}
