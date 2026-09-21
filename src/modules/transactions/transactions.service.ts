import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { decodeCursor, encodeCursor, normalizeLimit } from '../../common/cursor/keyset-cursor';
import { isExactDate } from '../../common/validation/exact.validators';
import { isManualTransactionAmount } from '../../common/validation/legacy-write.validators';
import { normalizeTransactionTimestamp } from '../../common/validation/transaction-timestamp';
import { CardXrefEntity } from '../cards/card-xref.entity';
import { TransactionCategoryEntity } from './reference.entity';
import { CreateTransactionDto, ListTransactionsQueryDto } from './dto/transactions.dto';
import { TransactionIdAllocatorService } from './transaction-id-allocator.service';
import { toTransactionResponse } from './transaction.mapper';
import { TransactionEntity } from './transaction.entity';
@Injectable()
export class TransactionsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly allocator: TransactionIdAllocatorService,
    private readonly config: ConfigService,
  ) {}
  async list(query: ListTransactionsQueryDto): Promise<Record<string, unknown>> {
    if (
      query.reportDateFrom &&
      (!isExactDate(query.reportDateFrom) ||
        (query.reportDateTo && query.reportDateFrom > query.reportDateTo))
    )
      throw new BadRequestException({
        code: 'INVALID_REPORT_DATE_RANGE',
        message: 'Report dates must be real and ordered.',
      });
    if (query.reportDateTo && !isExactDate(query.reportDateTo))
      throw new BadRequestException({
        code: 'INVALID_REPORT_DATE_RANGE',
        message: 'Report dates must be real and ordered.',
      });
    const limit = normalizeLimit(query.limit);
    const cursor = query.cursor ? decodeCursor(query.cursor, this.cursorSecret) : undefined;
    const direction = cursor?.direction ?? 'forward';
    const effective =
      this.config.get('reportTimestampMode') === 'processed'
        ? 't.processed_ts'
        : 'COALESCE(t.processed_ts, t.original_ts)';
    const qb = this.dataSource
      .getRepository(TransactionEntity)
      .createQueryBuilder('t')
      .orderBy('t.id', direction === 'forward' ? 'ASC' : 'DESC')
      .take(limit + 1);
    if (query.cardNumber) qb.andWhere('t.card_number=:card', { card: query.cardNumber });
    if (query.reportDateFrom)
      qb.andWhere(`${effective} >= :from`, { from: `${query.reportDateFrom} 00:00:00` });
    if (query.reportDateTo) {
      const next = new Date(`${query.reportDateTo}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      qb.andWhere(`${effective} < :to`, { to: `${next.toISOString().slice(0, 10)} 00:00:00` });
    }
    if (cursor)
      qb.andWhere(`t.id ${direction === 'forward' ? '>' : '<'} :key`, { key: cursor.key });
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    if (direction === 'backward') items.reverse();
    return {
      items: items.map(toTransactionResponse),
      page: {
        nextCursor:
          hasMore && items.length
            ? encodeCursor(
                { direction: 'forward', key: items[items.length - 1]!.id },
                this.cursorSecret,
              )
            : null,
        previousCursor: items.length
          ? encodeCursor({ direction: 'backward', key: items[0]!.id }, this.cursorSecret)
          : null,
      },
    };
  }
  async detail(id: string): Promise<Record<string, unknown>> {
    const tx = await this.dataSource.getRepository(TransactionEntity).findOneBy({ id });
    if (!tx) throw txNotFound();
    return toTransactionResponse(tx);
  }
  async create(dto: CreateTransactionDto): Promise<Record<string, unknown>> {
    if (Boolean(dto.accountId) === Boolean(dto.cardNumber))
      throw new BadRequestException({
        code: 'INVALID_TRANSACTION_REFERENCE',
        message: 'Provide exactly one account or card selector.',
      });
    if (!isManualTransactionAmount(dto.amount))
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Amount is outside manual transaction range.',
      });
    if (
      dto.source.trim().length < 1 ||
      dto.source.length > 10 ||
      dto.description.trim().length < 1 ||
      dto.description.length > 100 ||
      dto.merchantName.trim().length < 1 ||
      dto.merchantName.length > 50 ||
      dto.merchantCity.trim().length < 1 ||
      dto.merchantCity.length > 50 ||
      dto.merchantZip.trim().length < 1 ||
      dto.merchantZip.length > 10
    )
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Transaction text field is invalid.',
      });
    const originalTs = normalizeTransactionTimestamp(dto.originalTs);
    const processedTs =
      dto.processedTs === undefined || dto.processedTs === null
        ? null
        : normalizeTransactionTimestamp(dto.processedTs);
    return this.dataSource.transaction(async (manager) => {
      let xref: CardXrefEntity | undefined;
      if (dto.cardNumber)
        xref =
          (await manager.findOneBy(CardXrefEntity, { cardNumber: dto.cardNumber })) ?? undefined;
      else
        xref =
          (await manager
            .getRepository(CardXrefEntity)
            .createQueryBuilder('xref')
            .where('xref.account_id=:id', { id: dto.accountId })
            .orderBy('xref.card_number', 'ASC')
            .getOne()) ?? undefined;
      if (!xref)
        throw new NotFoundException({
          code: dto.cardNumber ? 'CARD_NOT_FOUND' : 'ACCOUNT_NOT_FOUND',
          message: 'Transaction selector not found.',
        });
      const reference = await manager.findOneBy(TransactionCategoryEntity, {
        typeCode: dto.typeCode,
        code: dto.categoryCode,
      });
      if (!reference)
        throw new BadRequestException({
          code: 'INVALID_TRANSACTION_REFERENCE',
          message: 'Transaction type/category does not exist.',
        });
      const tx = manager.create(TransactionEntity, {
        id: await this.allocator.allocate(manager),
        typeCode: dto.typeCode,
        categoryCode: dto.categoryCode,
        source: dto.source,
        description: dto.description,
        amount: dto.amount,
        merchantId: dto.merchantId,
        merchantName: dto.merchantName,
        merchantCity: dto.merchantCity,
        merchantZip: dto.merchantZip,
        cardNumber: xref.cardNumber,
        originalTs,
        processedTs,
      });
      return toTransactionResponse(await manager.save(tx));
    });
  }

  private get cursorSecret(): string {
    return this.config.getOrThrow<string>('cursorSecret');
  }
}
const txNotFound = (): NotFoundException =>
  new NotFoundException({ code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found.' });
