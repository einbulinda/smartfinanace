import { Module } from '@nestjs/common';
import { ProjectionController } from './projection.controller';
import { ProjectionService } from './projection.service';
import { DebtsModule } from '../debts/debts.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { AccountsModule } from '../accounts/accounts.module';
import { InvestmentsModule } from '../investments/investments.module';
import { ReceivablesModule } from '../receivables/receivables.module';

@Module({
  imports: [DebtsModule, TransactionsModule, AccountsModule, InvestmentsModule, ReceivablesModule],
  controllers: [ProjectionController],
  providers: [ProjectionService],
})
export class ProjectionModule {}
