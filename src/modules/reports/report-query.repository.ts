import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ReportRow, ReportTimestampMode } from './report-types';

const STRICT_SQL = `
SELECT t.id, x.account_id AS "accountId", t.card_number AS "cardNumber", t.type_code AS "typeCode", tt.description AS "typeDescription",
       t.category_code AS "categoryCode", tc.description AS "categoryDescription", t.source, t.amount, t.processed_ts AS "effectiveTs"
FROM transactions t JOIN card_xrefs x ON x.card_number = t.card_number
JOIN transaction_types tt ON tt.code = t.type_code
JOIN transaction_categories tc ON tc.type_code = t.type_code AND tc.code = t.category_code
WHERE t.processed_ts >= $1::date::timestamp AND t.processed_ts < ($2::date + 1)::timestamp
ORDER BY t.card_number ASC, t.id ASC`;
const FALLBACK_SQL = STRICT_SQL.replaceAll(
  't.processed_ts',
  'COALESCE(t.processed_ts, t.original_ts)',
);

@Injectable()
export class ReportQueryRepository {
  constructor(private readonly dataSource: DataSource) {}

  async snapshot(
    mode: ReportTimestampMode,
    rangeStart: string,
    rangeEnd: string,
  ): Promise<ReportRow[]> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction('REPEATABLE READ');
    try {
      await runner.query('SET TRANSACTION READ ONLY');
      const rows = (await runner.query(mode === 'processed' ? STRICT_SQL : FALLBACK_SQL, [
        rangeStart,
        rangeEnd,
      ])) as ReportRow[];
      await runner.commitTransaction();
      return rows;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
