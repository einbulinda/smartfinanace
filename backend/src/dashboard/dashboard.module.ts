import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { DebtsModule } from '../debts/debts.module';

@Module({
  imports: [TransactionsModule, DebtsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
