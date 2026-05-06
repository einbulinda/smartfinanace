import { Module } from '@nestjs/common';
import { OptimizerService } from './optimizer.service';

@Module({
  providers: [OptimizerService]
})
export class OptimizerModule {}
