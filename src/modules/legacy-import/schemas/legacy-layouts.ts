import type { LegacyDataset } from './source-catalog';

export type Pic =
  | 'text'
  | 'unsigned'
  | 'signed'
  | 'date'
  | 'timestamp-original'
  | 'timestamp-processed';
export interface LegacyField {
  readonly name: string;
  readonly destination?: string;
  readonly start: number;
  readonly end: number;
  readonly pic: Pic;
  readonly scale?: number;
  readonly stripRight?: boolean;
  readonly nullWhenBlank?: boolean;
  readonly key?: boolean;
}
export interface LegacyLayout {
  readonly dataset: LegacyDataset;
  readonly width: number;
  readonly fields: readonly LegacyField[];
}
const text = (
  name: string,
  start: number,
  end: number,
  destination = name,
  options: Partial<LegacyField> = {},
): LegacyField => ({ name, destination, start, end, pic: 'text', stripRight: true, ...options });
const filler = (start: number, end: number): LegacyField => ({
  name: 'filler',
  start,
  end,
  pic: 'text',
});
const signed = (
  name: string,
  start: number,
  end: number,
  scale: number,
  destination = name,
): LegacyField => ({ name, destination, start, end, pic: 'signed', scale });
const unsigned = (
  name: string,
  start: number,
  end: number,
  destination = name,
  key = false,
): LegacyField => ({ name, destination, start, end, pic: 'unsigned', key });
const date = (name: string, start: number, end: number, destination = name): LegacyField => ({
  name,
  destination,
  start,
  end,
  pic: 'date',
});

export const LEGACY_LAYOUTS: Readonly<Record<LegacyDataset, LegacyLayout>> = {
  customers: {
    dataset: 'customers',
    width: 500,
    fields: [
      unsigned('id', 0, 9, 'id', true),
      text('first', 9, 34, 'firstName'),
      text('middle', 34, 59, 'middleName', { nullWhenBlank: true }),
      text('last', 59, 84, 'lastName'),
      text('address1', 84, 134, 'addressLine1'),
      text('address2', 134, 184, 'addressLine2', { nullWhenBlank: true }),
      text('address3', 184, 234, 'addressLine3', { nullWhenBlank: true }),
      text('state', 234, 236, 'addressStateCode'),
      text('country', 236, 239, 'addressCountryCode'),
      text('zip', 239, 249, 'addressZip', { stripRight: false }),
      text('phone1', 249, 264, 'phoneNumber1', { nullWhenBlank: true }),
      text('phone2', 264, 279, 'phoneNumber2', { nullWhenBlank: true }),
      unsigned('ssn', 279, 288),
      text('governmentId', 288, 308, 'governmentIssuedId'),
      date('dob', 308, 318),
      text('eftAccountId', 318, 328, 'eftAccountId', { nullWhenBlank: true, stripRight: false }),
      text('primaryCardHolder', 328, 329),
      unsigned('ficoScore', 329, 332),
      filler(332, 500),
    ],
  },
  accounts: {
    dataset: 'accounts',
    width: 300,
    fields: [
      unsigned('id', 0, 11, 'id', true),
      text('status', 11, 12),
      signed('currentBalance', 12, 24, 2),
      signed('creditLimit', 24, 36, 2),
      signed('cashCreditLimit', 36, 48, 2),
      date('openDate', 48, 58),
      date('expirationDate', 58, 68),
      date('reissueDate', 68, 78),
      signed('currentCycleCredit', 78, 90, 2),
      signed('currentCycleDebit', 90, 102, 2),
      text('addressZip', 102, 112, 'addressZip', { stripRight: false }),
      text('groupId', 112, 122, 'groupId', { stripRight: false }),
      filler(122, 300),
    ],
  },
  accountsDuplicate: { dataset: 'accountsDuplicate', width: 300, fields: [] },
  cards: {
    dataset: 'cards',
    width: 150,
    fields: [
      unsigned('number', 0, 16, 'number', true),
      unsigned('accountId', 16, 27),
      unsigned('cvv', 27, 30),
      text('embossedName', 30, 80),
      date('expiryDate', 80, 90),
      text('status', 90, 91),
      filler(91, 150),
    ],
  },
  cardXrefs: {
    dataset: 'cardXrefs',
    width: 50,
    fields: [
      unsigned('cardNumber', 0, 16, 'cardNumber', true),
      unsigned('customerId', 16, 25),
      unsigned('accountId', 25, 36),
      filler(36, 50),
    ],
  },
  transactions: {
    dataset: 'transactions',
    width: 350,
    fields: [
      unsigned('id', 0, 16, 'id', true),
      text('typeCode', 16, 18),
      text('categoryCode', 18, 22),
      text('source', 22, 32),
      text('description', 32, 132),
      signed('amount', 132, 143, 2),
      unsigned('merchantId', 143, 152),
      text('merchantName', 152, 202),
      text('merchantCity', 202, 252),
      text('merchantZip', 252, 262, 'merchantZip', { stripRight: false }),
      unsigned('cardNumber', 262, 278),
      {
        name: 'originalTs',
        destination: 'originalTs',
        start: 278,
        end: 304,
        pic: 'timestamp-original',
      },
      {
        name: 'processedTs',
        destination: 'processedTs',
        start: 304,
        end: 330,
        pic: 'timestamp-processed',
      },
      filler(330, 350),
    ],
  },
  transactionsInit: { dataset: 'transactionsInit', width: 350, fields: [] },
  disclosureGroups: {
    dataset: 'disclosureGroups',
    width: 50,
    fields: [
      text('accountGroupId', 0, 10, 'accountGroupId', { stripRight: false, key: true }),
      text('transactionTypeCode', 10, 12, 'transactionTypeCode', { key: true }),
      text('transactionCategoryCode', 12, 16, 'transactionCategoryCode', { key: true }),
      signed('interestRate', 16, 22, 2),
      filler(22, 50),
    ],
  },
  categoryBalances: {
    dataset: 'categoryBalances',
    width: 50,
    fields: [
      unsigned('accountId', 0, 11, 'accountId', true),
      text('transactionTypeCode', 11, 13, 'transactionTypeCode', { key: true }),
      text('transactionCategoryCode', 13, 17, 'transactionCategoryCode', { key: true }),
      signed('balance', 17, 28, 2),
      filler(28, 50),
    ],
  },
  transactionTypes: {
    dataset: 'transactionTypes',
    width: 60,
    fields: [text('code', 0, 2, 'code', { key: true }), text('description', 2, 52), filler(52, 60)],
  },
  transactionCategories: {
    dataset: 'transactionCategories',
    width: 60,
    fields: [
      text('typeCode', 0, 2, 'typeCode', { key: true }),
      text('code', 2, 6, 'code', { key: true }),
      text('description', 6, 56),
      filler(56, 60),
    ],
  },
  users: {
    dataset: 'users',
    width: 80,
    fields: [
      text('id', 0, 8, 'id', { key: true }),
      text('firstName', 8, 28),
      text('lastName', 28, 48),
      text('password', 48, 56, 'password', { stripRight: false }),
      text('role', 56, 57),
      filler(57, 80),
    ],
  },
};

export function layoutFor(dataset: LegacyDataset): LegacyLayout {
  return LEGACY_LAYOUTS[dataset];
}
export function assertLayout(layout: LegacyLayout): void {
  let offset = 0;
  for (const field of layout.fields) {
    if (field.start !== offset || field.end <= field.start)
      throw new Error(`Invalid ${layout.dataset} layout at ${field.name}`);
    offset = field.end;
  }
  if (layout.fields.length && offset !== layout.width)
    throw new Error(`Invalid ${layout.dataset} width`);
}
