import type { QueryRunner } from 'typeorm';
import type { ParsedSources, ImportWarning } from '../validators/import.validator';

export interface ReconciliationSummary {
  readonly sourceCounts: Record<string, number>;
  readonly tableCounts: Record<string, number>;
  readonly warnings: ImportWarning[];
  readonly transactionIdRange: { min: string | null; max: string | null };
  readonly transactionAmountSum: string;
  readonly nullProcessedTimestamps: number;
  readonly sequenceState: string;
}
const TABLES: Readonly<Record<string, string>> = {
  transactionTypes: 'transaction_types',
  transactionCategories: 'transaction_categories',
  customers: 'customers',
  accounts: 'accounts',
  cards: 'cards',
  cardXrefs: 'card_xrefs',
  disclosureGroups: 'disclosure_groups',
  categoryBalances: 'category_balances',
  users: 'users',
  transactions: 'transactions',
};
export async function reconcile(
  runner: QueryRunner,
  sources: ParsedSources,
  warnings: ImportWarning[],
): Promise<ReconciliationSummary> {
  const sourceCounts: Record<string, number> = {};
  const tableCounts: Record<string, number> = {};
  for (const [key, table] of Object.entries(TABLES)) {
    sourceCounts[key] = sources[key as keyof ParsedSources]?.length ?? 0;
    const queriedRows: unknown = await runner.query(`SELECT count(*)::text AS count FROM ${table}`);
    const rows = Array.isArray(queriedRows) ? (queriedRows as Array<{ count: string }>) : [];
    tableCounts[key] = Number(rows[0]?.count ?? 0);
  }
  const queriedStats: unknown = await runner.query(
    `SELECT min(id)::text AS min, max(id)::text AS max, coalesce(sum(amount), 0)::text AS sum, count(*) FILTER (WHERE processed_ts IS NULL)::text AS nulls FROM transactions`,
  );
  const stats = Array.isArray(queriedStats)
    ? (queriedStats as Array<{
        min: string | null;
        max: string | null;
        sum: string;
        nulls: string;
      }>)
    : [];
  const queriedSequence: unknown = await runner.query(
    `SELECT last_value::text FROM transaction_id_sequence`,
  );
  const sequence = Array.isArray(queriedSequence)
    ? (queriedSequence as Array<{ last_value: string }>)
    : [];
  return {
    sourceCounts,
    tableCounts,
    warnings,
    transactionIdRange: { min: stats[0]?.min ?? null, max: stats[0]?.max ?? null },
    transactionAmountSum: stats[0]?.sum ?? '0.00',
    nullProcessedTimestamps: Number(stats[0]?.nulls ?? 0),
    sequenceState: sequence[0]?.last_value ?? '1',
  };
}
