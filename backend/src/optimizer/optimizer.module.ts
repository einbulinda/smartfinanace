import { Module } from '@nestjs/common';
import { OptimizerController } from './optimizer.controller';
import { OptimizerService } from './optimizer.service';
import { DebtsModule } from '../debts/debts.module';

@Module({
  imports: [DebtsModule],
  controllers: [OptimizerController],
  providers: [OptimizerService],
})
export class OptimizerModule {}
