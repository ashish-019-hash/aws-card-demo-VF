import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/account.entity';
import { CardXrefEntity } from '../cards/card-xref.entity';
import { CardEntity } from '../cards/card.entity';
import { CustomerEntity } from '../customers/customer.entity';
import { TransactionEntity } from '../transactions/transaction.entity';
import {
  CategoryBalanceEntity,
  DisclosureGroupEntity,
  TransactionCategoryEntity,
  TransactionTypeEntity,
} from '../transactions/reference.entity';
import { UserEntity } from '../users/user.entity';
import { LegacyImportRunEntity } from './legacy-import-run.entity';
import { LegacyImportService } from './legacy-import.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountEntity,
      CardEntity,
      CardXrefEntity,
      CustomerEntity,
      TransactionEntity,
      TransactionTypeEntity,
      TransactionCategoryEntity,
      DisclosureGroupEntity,
      CategoryBalanceEntity,
      UserEntity,
      LegacyImportRunEntity,
    ]),
  ],
  providers: [LegacyImportService],
  exports: [LegacyImportService],
})
export class LegacyImportModule {}
