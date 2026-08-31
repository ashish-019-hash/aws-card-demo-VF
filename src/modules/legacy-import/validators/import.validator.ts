import type { LegacyDataset } from '../schemas/source-catalog';
import type { ParsedRecord } from '../parsers/record.parser';

export type ParsedSources = Partial<Record<LegacyDataset, ParsedRecord[]>>;
export interface ImportWarning {
  readonly code: 'LEGACY_FICO_OUTSIDE_API_RANGE';
  readonly dataset: 'customers';
  readonly key: string;
  readonly value: string;
}
const value = (record: ParsedRecord, name: string): string => {
  const field = record.values[name];
  if (typeof field !== 'string')
    throw new Error(`${record.dataset} record ${record.record}: ${name} is required`);
  return field;
};
const key = (record: ParsedRecord): string =>
  Object.entries(record.values)
    .filter(([name]) =>
      /^(id|number|cardNumber|code|typeCode|accountId|accountGroupId|transactionTypeCode|transactionCategoryCode)$/.test(
        name,
      ),
    )
    .map(([, field]) => field ?? '')
    .join('|');

function records(sources: ParsedSources, dataset: LegacyDataset): ParsedRecord[] {
  const values = sources[dataset];
  if (!values) throw new Error(`Missing ${dataset} source`);
  return values;
}
function unique(rows: ParsedRecord[], dataset: LegacyDataset): void {
  const keys = new Set<string>();
  for (const row of rows) {
    const value = key(row);
    if (keys.has(value)) throw new Error(`${dataset}: duplicate key ${value}`);
    keys.add(value);
  }
}
function has(rows: ParsedRecord[], predicate: (row: ParsedRecord) => boolean): boolean {
  return rows.some(predicate);
}

export function validateImportSources(
  sources: ParsedSources,
  mode: 'canonical-ebcdic' | 'ascii-mirror',
): ImportWarning[] {
  const required: LegacyDataset[] = [
    'transactionTypes',
    'transactionCategories',
    'customers',
    'accounts',
    'cards',
    'cardXrefs',
    'disclosureGroups',
    'categoryBalances',
    'transactions',
  ];
  if (mode === 'canonical-ebcdic') required.push('users');
  for (const dataset of required) unique(records(sources, dataset), dataset);
  const types = records(sources, 'transactionTypes');
  const categories = records(sources, 'transactionCategories');
  const accounts = records(sources, 'accounts');
  const cards = records(sources, 'cards');
  const customers = records(sources, 'customers');
  const categoryExists = (typeCode: string, categoryCode: string) =>
    has(
      categories,
      (row) => value(row, 'typeCode') === typeCode && value(row, 'code') === categoryCode,
    );
  for (const row of categories)
    if (!has(types, (type) => value(type, 'code') === value(row, 'typeCode')))
      throw new Error(`transactionCategories: unknown type ${value(row, 'typeCode')}`);
  for (const row of records(sources, 'disclosureGroups'))
    if (!categoryExists(value(row, 'transactionTypeCode'), value(row, 'transactionCategoryCode')))
      throw new Error(`disclosureGroups: unknown category`);
  for (const row of records(sources, 'categoryBalances')) {
    if (!has(accounts, (account) => value(account, 'id') === value(row, 'accountId')))
      throw new Error(`categoryBalances: unknown account`);
    if (!categoryExists(value(row, 'transactionTypeCode'), value(row, 'transactionCategoryCode')))
      throw new Error('categoryBalances: unknown category');
  }
  for (const row of cards) {
    if (!has(accounts, (account) => value(account, 'id') === value(row, 'accountId')))
      throw new Error(`cards: unknown account ${value(row, 'accountId')}`);
    if (!['Y', 'N'].includes(value(row, 'status'))) throw new Error('cards: status must be Y or N');
  }
  for (const row of accounts)
    if (!['Y', 'N'].includes(value(row, 'status')))
      throw new Error('accounts: status must be Y or N');
  for (const row of records(sources, 'cardXrefs')) {
    const card = cards.find((candidate) => value(candidate, 'number') === value(row, 'cardNumber'));
    if (!card) throw new Error('cardXrefs: unknown card');
    if (!has(customers, (customer) => value(customer, 'id') === value(row, 'customerId')))
      throw new Error('cardXrefs: unknown customer');
    if (value(card, 'accountId') !== value(row, 'accountId'))
      throw new Error('cardXrefs: account does not match card');
  }
  for (const row of records(sources, 'transactions')) {
    if (!has(cards, (card) => value(card, 'number') === value(row, 'cardNumber')))
      throw new Error('transactions: unknown card');
    if (!categoryExists(value(row, 'typeCode'), value(row, 'categoryCode')))
      throw new Error('transactions: unknown category');
  }
  const warnings: ImportWarning[] = [];
  for (const row of customers) {
    const fico = value(row, 'ficoScore');
    if (!/^\d{3}$/.test(fico)) throw new Error('customers: FICO must have three digits');
    if (Number(fico) < 300 || Number(fico) > 850)
      warnings.push({
        code: 'LEGACY_FICO_OUTSIDE_API_RANGE',
        dataset: 'customers',
        key: value(row, 'id'),
        value: fico,
      });
  }
  return warnings;
}
