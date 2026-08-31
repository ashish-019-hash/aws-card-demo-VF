import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { CorrelationIdMiddleware } from './common/logging/correlation-id.middleware';
import { DatabaseModule } from './database/database.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { CardsModule } from './modules/cards/cards.module';
import { CustomersModule } from './modules/customers/customers.module';
import { HealthModule } from './modules/health/health.module';
import { LegacyImportModule } from './modules/legacy-import/legacy-import.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    AccountsModule,
    CardsModule,
    TransactionsModule,
    PaymentsModule,
    ReportsModule,
    LegacyImportModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
