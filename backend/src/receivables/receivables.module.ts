import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesService } from './receivables.service';
import { Receivable } from './entities/receivable.entity';
import { ReceivableRepayment } from './entities/receivable-repayment.entity';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Receivable, ReceivableRepayment]), TransactionsModule],
  controllers: [ReceivablesController],
  providers: [ReceivablesService],
  exports: [ReceivablesService],
})
export class ReceivablesModule {}
