import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { DebtsModule } from '../debts/debts.module';
import { InvestmentsModule } from '../investments/investments.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { ReceivablesModule } from '../receivables/receivables.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ManualAssetsModule } from '../manual-assets/manual-assets.module';

@Module({
  imports: [TransactionsModule, DebtsModule, InvestmentsModule, InsuranceModule, ReceivablesModule, AccountsModule, ManualAssetsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
