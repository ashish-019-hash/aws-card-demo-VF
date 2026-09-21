import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
@Module({
  imports: [AccountsModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
