import { TransactionEntity } from './transaction.entity';
export function toTransactionResponse(transaction: TransactionEntity): Record<string, unknown> {
  return {
    id: transaction.id.trimEnd(),
    cardNumber: transaction.cardNumber.trimEnd(),
    typeCode: transaction.typeCode.trimEnd(),
    categoryCode: transaction.categoryCode.trimEnd(),
    source: transaction.source,
    description: transaction.description,
    amount: transaction.amount,
    merchantId: transaction.merchantId.trimEnd(),
    merchantName: transaction.merchantName,
    merchantCity: transaction.merchantCity,
    merchantZip: transaction.merchantZip.trimEnd(),
    originalTs: transaction.originalTs,
    processedTs: transaction.processedTs,
    version: transaction.version,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  };
}
