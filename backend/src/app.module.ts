import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DebtsModule } from './debts/debts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OptimizerModule } from './optimizer/optimizer.module';
import { ProjectionModule } from './projection/projection.module';
import { InvestmentsModule } from './investments/investments.module';
import { InsuranceModule } from './insurance/insurance.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { BudgetsModule } from './budgets/budgets.module';
import { AccountsModule } from './accounts/accounts.module';
import { ManualAssetsModule } from './manual-assets/manual-assets.module';
import { ProjectsModule } from './projects/projects.module';
import { GoalsModule } from './goals/goals.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL')
        const sslEnabled = config.get<string>('DB_SSL') !== 'false'
        const isProd = config.get<string>('NODE_ENV') === 'production'

        const base = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          // Set NODE_ENV=production to disable auto-sync (use migrations instead)
          synchronize: !isProd,
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        }

        // Supabase (and other providers) supply a single DATABASE_URL
        if (dbUrl) return { ...base, url: dbUrl }

        // Fallback: individual params (local dev or self-hosted DO Postgres)
        return {
          ...base,
          host: config.get<string>('DB_HOST'),
          port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
          username: config.get<string>('DB_USERNAME'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
        }
      },
    }),
    AuthModule,
    UsersModule,
    TransactionsModule,
    DebtsModule,
    DashboardModule,
    OptimizerModule,
    ProjectionModule,
    InvestmentsModule,
    InsuranceModule,
    ReceivablesModule,
    BudgetsModule,
    AccountsModule,
    ManualAssetsModule,
    ProjectsModule,
    GoalsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
