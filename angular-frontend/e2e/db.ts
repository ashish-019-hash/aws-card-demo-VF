import { Client } from 'pg';

function testDatabaseUrl() {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) throw new Error('TEST_DATABASE_URL is required for E2E database evidence.');
  return url;
}

async function query<T extends Record<string, unknown>>(sql: string, values: unknown[] = []) {
  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    return await client.query<T>(sql, values);
  } finally {
    await client.end();
  }
}

export async function accountVersion(accountId: string) {
  const result = await query<{ version: number; credit_limit: string }>('SELECT version, credit_limit FROM accounts WHERE id = $1', [accountId]);
  if (!result.rowCount) throw new Error(`Account ${accountId} is missing from the isolated E2E database.`);
  return result.rows[0];
}

export async function transactionEvidence(description: string) {
  const result = await query<{ count: string; ids: string[] }>(
    'SELECT count(*)::text AS count, array_agg(id ORDER BY id) AS ids FROM transactions WHERE description = $1',
    [description]
  );
  return { count: Number(result.rows[0].count), ids: result.rows[0].ids ?? [] };
}
