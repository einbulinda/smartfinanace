import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ManualAssetsController } from './manual-assets.controller';
import { ManualAssetsService } from './manual-assets.service';
import { ManualAsset } from './entities/manual-asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ManualAsset])],
  controllers: [ManualAssetsController],
  providers: [ManualAssetsService],
  exports: [ManualAssetsService],
})
export class ManualAssetsModule {}
