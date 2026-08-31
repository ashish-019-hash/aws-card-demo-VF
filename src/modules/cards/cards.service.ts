import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decodeCursor, encodeCursor, normalizeLimit } from '../../common/cursor/keyset-cursor';
import { AccountEntity } from '../accounts/account.entity';
import { CardXrefEntity } from './card-xref.entity';
import { CardEntity } from './card.entity';
import { toCardDetail, toCardListItem } from './card.mapper';
import { type ListCardsQueryDto, type UpdateCardDto, validExpiry } from './dto/cards.dto';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(CardEntity) private readonly cards: Repository<CardEntity>,
    @InjectRepository(CardXrefEntity) private readonly xrefs: Repository<CardXrefEntity>,
    @InjectRepository(AccountEntity) private readonly accounts: Repository<AccountEntity>,
    private readonly config: ConfigService,
  ) {}
  async list(query: ListCardsQueryDto): Promise<Record<string, unknown>> {
    const limit = normalizeLimit(query.limit);
    const cursor = query.cursor ? decodeCursor(query.cursor, this.cursorSecret) : undefined;
    const direction = cursor?.direction ?? 'forward';
    const qb = this.cards
      .createQueryBuilder('card')
      .orderBy('card.number', direction === 'forward' ? 'ASC' : 'DESC')
      .take(limit + 1);
    if (query.accountId)
      qb.andWhere('card.account_id = :accountId', { accountId: query.accountId });
    if (query.cardNumber)
      qb.andWhere('card.number = :cardNumber', { cardNumber: query.cardNumber });
    if (cursor)
      qb.andWhere(`card.number ${direction === 'forward' ? '>' : '<'} :key`, { key: cursor.key });
    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    if (direction === 'backward') items.reverse();
    return {
      items: items.map(toCardListItem),
      page: {
        nextCursor:
          hasMore && items.length
            ? encodeCursor(
                { direction: 'forward', key: items[items.length - 1]!.number },
                this.cursorSecret,
              )
            : null,
        previousCursor: items.length
          ? encodeCursor({ direction: 'backward', key: items[0]!.number }, this.cursorSecret)
          : null,
      },
    };
  }
  async detail(number: string): Promise<Record<string, unknown>> {
    const card = await this.cards
      .createQueryBuilder('card')
      .addSelect('card.cvv')
      .where('card.number = :number', { number })
      .getOne();
    if (!card) throw cardNotFound();
    const [account, xref] = await Promise.all([
      this.accounts.findOneBy({ id: card.accountId }),
      this.xrefs.findOneBy({ cardNumber: number }),
    ]);
    return {
      card: toCardDetail(card),
      account: account
        ? {
            id: account.id.trimEnd(),
            currentBalance: account.currentBalance,
            version: account.version,
          }
        : null,
      customer: xref ? { id: xref.customerId.trimEnd() } : null,
    };
  }
  async update(number: string, dto: UpdateCardDto): Promise<Record<string, unknown>> {
    if (dto.expiryDate !== undefined && !validExpiry(dto.expiryDate))
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'expiryDate must be a real date between 1950 and 2099.',
      });
    const card = await this.cards
      .createQueryBuilder('card')
      .addSelect('card.cvv')
      .where('card.number = :number', { number })
      .getOne();
    if (!card) throw cardNotFound();
    if (
      dto.embossedName === undefined &&
      dto.expiryDate === undefined &&
      dto.status === undefined &&
      dto.cvv === undefined
    )
      throw noChanges();
    if (
      (dto.embossedName === undefined || dto.embossedName === card.embossedName) &&
      (dto.expiryDate === undefined || dto.expiryDate === card.expiryDate) &&
      (dto.status === undefined || dto.status === card.status) &&
      (dto.cvv === undefined || dto.cvv === card.cvv)
    )
      throw noChanges();
    const result = await this.cards
      .createQueryBuilder()
      .update(CardEntity)
      .set({
        embossedName: dto.embossedName ?? card.embossedName,
        expiryDate: dto.expiryDate ?? card.expiryDate,
        status: dto.status ?? card.status,
        cvv: dto.cvv ?? card.cvv,
        version: () => 'version + 1',
        updatedAt: () => 'CURRENT_TIMESTAMP',
      })
      .where('number = :number AND version = :version', { number, version: dto.expectedVersion })
      .execute();
    if (result.affected !== 1)
      throw (await this.cards.exists({ where: { number } })) ? versionConflict() : cardNotFound();
    const updated = await this.cards
      .createQueryBuilder('card')
      .addSelect('card.cvv')
      .where('card.number = :number', { number })
      .getOne();
    if (!updated) throw cardNotFound();
    return toCardDetail(updated);
  }

  private get cursorSecret(): string {
    return this.config.getOrThrow<string>('cursorSecret');
  }
}
const cardNotFound = (): NotFoundException =>
  new NotFoundException({ code: 'CARD_NOT_FOUND', message: 'Card not found.' });
const versionConflict = (): ConflictException =>
  new ConflictException({ code: 'VERSION_CONFLICT', message: 'Version does not match.' });
const noChanges = (): BadRequestException =>
  new BadRequestException({
    code: 'NO_CHANGES',
    message: 'At least one effective change is required.',
  });
