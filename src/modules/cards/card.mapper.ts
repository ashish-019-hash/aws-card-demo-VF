import { trimFixed } from '../../common/validation/legacy-write.validators';
import { CardEntity } from './card.entity';

export function toCardListItem(card: CardEntity): Record<string, unknown> {
  return {
    number: trimFixed(card.number),
    accountId: trimFixed(card.accountId),
    embossedName: card.embossedName,
    expiryDate: card.expiryDate,
    status: card.status,
    version: card.version,
  };
}
export function toCardDetail(card: CardEntity): Record<string, unknown> {
  return {
    ...toCardListItem(card),
    cvv: card.cvv,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}
