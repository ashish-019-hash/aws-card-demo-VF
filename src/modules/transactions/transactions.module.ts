import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionIdAllocatorService } from './transaction-id-allocator.service';
import { TransactionsService } from './transactions.service';
@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionIdAllocatorService],
  exports: [TransactionIdAllocatorService],
})
export class TransactionsModule {}
