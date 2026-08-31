import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { withPostgresRetry } from '../../common/database/postgres-retry';
import { AccountEntity } from '../accounts/account.entity';
import { CardXrefEntity } from '../cards/card-xref.entity';
import { TransactionIdAllocatorService } from '../transactions/transaction-id-allocator.service';
import { toTransactionResponse } from '../transactions/transaction.mapper';
import { TransactionEntity } from '../transactions/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PAYMENT_TRANSACTION } from './payment.constants';
@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly allocator: TransactionIdAllocatorService,
  ) {}
  async create(dto: CreatePaymentDto): Promise<Record<string, unknown>> {
    try {
      return await withPostgresRetry(() =>
        this.dataSource.transaction(async (manager) => {
          const account = await manager
            .createQueryBuilder(AccountEntity, 'account')
            .setLock('pessimistic_write')
            .where('account.id=:id', { id: dto.accountId })
            .getOne();
          if (!account)
            throw new NotFoundException({
              code: 'ACCOUNT_NOT_FOUND',
              message: 'Account not found.',
            });
          if (account.version !== dto.expectedVersion)
            throw new ConflictException({
              code: 'VERSION_CONFLICT',
              message: 'Version does not match.',
            });
          if (BigInt(account.currentBalance.replace('.', '')) <= 0n)
            throw new ConflictException({
              code: 'NOTHING_TO_PAY',
              message: 'Account has no positive balance.',
            });
          const xref = await manager
            .getRepository(CardXrefEntity)
            .createQueryBuilder('xref')
            .where('xref.account_id=:id', { id: dto.accountId })
            .orderBy('xref.card_number', 'ASC')
            .getOne();
          if (!xref)
            throw new ConflictException({
              code: 'PAYMENT_CARD_NOT_FOUND',
              message: 'Account has no payment card.',
            });
          const id = await this.allocator.allocate(manager);
          const nowRows = await manager.query<{ now: string }[]>(
            'SELECT CURRENT_TIMESTAMP::timestamp(6)::text AS now',
          );
          const now = (nowRows as unknown as Array<{ now: string }>)[0]!.now;
          const transaction = manager.create(TransactionEntity, {
            id,
            cardNumber: xref.cardNumber,
            amount: account.currentBalance,
            originalTs: now,
            processedTs: now,
            ...PAYMENT_TRANSACTION,
          });
          const saved = await manager.save(transaction);
          const updated = await manager
            .createQueryBuilder()
            .update(AccountEntity)
            .set({
              currentBalance: '0.00',
              version: () => 'version + 1',
              updatedAt: () => 'CURRENT_TIMESTAMP',
            })
            .where('id=:id AND version=:version', {
              id: dto.accountId,
              version: dto.expectedVersion,
            })
            .execute();
          if (updated.affected !== 1)
            throw new ConflictException({
              code: 'VERSION_CONFLICT',
              message: 'Version does not match.',
            });
          const updatedAccount = await manager.findOneBy(AccountEntity, { id: dto.accountId });
          if (!updatedAccount)
            throw new NotFoundException({
              code: 'ACCOUNT_NOT_FOUND',
              message: 'Account not found.',
            });
          return {
            transaction: toTransactionResponse(saved),
            account: {
              id: updatedAccount.id.trimEnd(),
              currentBalance: updatedAccount.currentBalance,
              version: updatedAccount.version,
            },
          };
        }),
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        ['40001', '40P01'].includes((error as { code?: string }).code ?? '')
      )
        throw new ServiceUnavailableException({
          code: 'PAYMENT_RETRYABLE',
          message: 'Payment could not be completed. Retry shortly.',
        });
      throw error;
    }
  }
}
