import * as bcrypt from 'bcrypt';
import type { QueryRunner } from 'typeorm';
import type { ParsedSources } from '../validators/import.validator';
import type { ParsedRecord } from '../parsers/record.parser';

const required = (record: ParsedRecord, field: string): string => {
  const value = record.values[field];
  if (typeof value !== 'string')
    throw new Error(`${record.dataset} record ${record.record}: ${field} is required`);
  return value;
};
const optional = (record: ParsedRecord, field: string): string | null =>
  record.values[field] ?? null;

export class LegacyUpsertRepository {
  constructor(private readonly runner: QueryRunner) {}

  private async upsert(
    table: string,
    columns: readonly string[],
    conflict: readonly string[],
    values: readonly (string | null)[],
    versioned = false,
  ): Promise<void> {
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const changed = columns.map((column) => `target.${column}`).join(', ');
    const incoming = columns.map((column) => `EXCLUDED.${column}`).join(', ');
    const updates = columns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');
    const updateSuffix = versioned
      ? `, version = target.version + 1, updated_at = CURRENT_TIMESTAMP`
      : '';
    await this.runner.query(
      `INSERT INTO ${table} AS target (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflict.join(', ')}) DO UPDATE SET ${updates}${updateSuffix} WHERE (${changed}) IS DISTINCT FROM (${incoming})`,
      [...values],
    );
  }

  async upsertAll(sources: ParsedSources): Promise<void> {
    for (const row of sources.transactionTypes ?? [])
      await this.upsert(
        'transaction_types',
        ['code', 'description'],
        ['code'],
        [required(row, 'code'), required(row, 'description')],
      );
    for (const row of sources.transactionCategories ?? [])
      await this.upsert(
        'transaction_categories',
        ['type_code', 'code', 'description'],
        ['type_code', 'code'],
        [required(row, 'typeCode'), required(row, 'code'), required(row, 'description')],
      );
    for (const row of sources.customers ?? [])
      await this.upsert(
        'customers',
        [
          'id',
          'first_name',
          'middle_name',
          'last_name',
          'address_line_1',
          'address_line_2',
          'address_line_3',
          'address_state_code',
          'address_country_code',
          'address_zip',
          'phone_number_1',
          'phone_number_2',
          'ssn',
          'government_issued_id',
          'dob',
          'eft_account_id',
          'primary_card_holder',
          'fico_score',
        ],
        ['id'],
        [
          required(row, 'id'),
          required(row, 'firstName'),
          optional(row, 'middleName'),
          required(row, 'lastName'),
          required(row, 'addressLine1'),
          optional(row, 'addressLine2'),
          optional(row, 'addressLine3'),
          required(row, 'addressStateCode'),
          required(row, 'addressCountryCode'),
          required(row, 'addressZip'),
          optional(row, 'phoneNumber1'),
          optional(row, 'phoneNumber2'),
          required(row, 'ssn'),
          required(row, 'governmentIssuedId'),
          required(row, 'dob'),
          optional(row, 'eftAccountId'),
          required(row, 'primaryCardHolder'),
          required(row, 'ficoScore'),
        ],
        true,
      );
    for (const row of sources.accounts ?? [])
      await this.upsert(
        'accounts',
        [
          'id',
          'status',
          'current_balance',
          'credit_limit',
          'cash_credit_limit',
          'open_date',
          'expiration_date',
          'reissue_date',
          'current_cycle_credit',
          'current_cycle_debit',
          'address_zip',
          'group_id',
        ],
        ['id'],
        [
          required(row, 'id'),
          required(row, 'status'),
          required(row, 'currentBalance'),
          required(row, 'creditLimit'),
          required(row, 'cashCreditLimit'),
          required(row, 'openDate'),
          required(row, 'expirationDate'),
          required(row, 'reissueDate'),
          required(row, 'currentCycleCredit'),
          required(row, 'currentCycleDebit'),
          required(row, 'addressZip'),
          required(row, 'groupId'),
        ],
        true,
      );
    for (const row of sources.cards ?? [])
      await this.upsert(
        'cards',
        ['number', 'account_id', 'cvv', 'embossed_name', 'expiry_date', 'status'],
        ['number'],
        [
          required(row, 'number'),
          required(row, 'accountId'),
          required(row, 'cvv'),
          required(row, 'embossedName'),
          required(row, 'expiryDate'),
          required(row, 'status'),
        ],
        true,
      );
    for (const row of sources.cardXrefs ?? [])
      await this.upsert(
        'card_xrefs',
        ['card_number', 'customer_id', 'account_id'],
        ['card_number'],
        [required(row, 'cardNumber'), required(row, 'customerId'), required(row, 'accountId')],
      );
    for (const row of sources.disclosureGroups ?? [])
      await this.upsert(
        'disclosure_groups',
        ['account_group_id', 'transaction_type_code', 'transaction_category_code', 'interest_rate'],
        ['account_group_id', 'transaction_type_code', 'transaction_category_code'],
        [
          required(row, 'accountGroupId'),
          required(row, 'transactionTypeCode'),
          required(row, 'transactionCategoryCode'),
          required(row, 'interestRate'),
        ],
      );
    for (const row of sources.categoryBalances ?? [])
      await this.upsert(
        'category_balances',
        ['account_id', 'transaction_type_code', 'transaction_category_code', 'balance'],
        ['account_id', 'transaction_type_code', 'transaction_category_code'],
        [
          required(row, 'accountId'),
          required(row, 'transactionTypeCode'),
          required(row, 'transactionCategoryCode'),
          required(row, 'balance'),
        ],
      );
    await this.upsertUsers(sources.users ?? []);
    for (const row of sources.transactions ?? [])
      await this.upsert(
        'transactions',
        [
          'id',
          'type_code',
          'category_code',
          'source',
          'description',
          'amount',
          'merchant_id',
          'merchant_name',
          'merchant_city',
          'merchant_zip',
          'card_number',
          'original_ts',
          'processed_ts',
        ],
        ['id'],
        [
          required(row, 'id'),
          required(row, 'typeCode'),
          required(row, 'categoryCode'),
          required(row, 'source'),
          required(row, 'description'),
          required(row, 'amount'),
          required(row, 'merchantId'),
          required(row, 'merchantName'),
          required(row, 'merchantCity'),
          required(row, 'merchantZip'),
          required(row, 'cardNumber'),
          required(row, 'originalTs'),
          optional(row, 'processedTs'),
        ],
        true,
      );
    await this.runner.query('SELECT reinitialize_transaction_id_sequence()');
  }

  private async upsertUsers(rows: readonly ParsedRecord[]): Promise<void> {
    for (const row of rows) {
      const id = required(row, 'id').toUpperCase();
      let password = required(row, 'password');
      const existingResult: unknown = await this.runner.query(
        'SELECT password_hash FROM users WHERE id = $1 FOR UPDATE',
        [id],
      );
      const existing = Array.isArray(existingResult)
        ? (existingResult as Array<{ password_hash: string }>)
        : [];
      const matching = existing[0]
        ? await bcrypt.compare(password, existing[0].password_hash)
        : false;
      const passwordHash = matching ? existing[0]!.password_hash : await bcrypt.hash(password, 12);
      password = '';
      row.values.password = null;
      await this.upsert(
        'users',
        ['id', 'first_name', 'last_name', 'password_hash', 'role'],
        ['id'],
        [
          id,
          required(row, 'firstName'),
          required(row, 'lastName'),
          passwordHash,
          required(row, 'role'),
        ],
        true,
      );
    }
  }
}
