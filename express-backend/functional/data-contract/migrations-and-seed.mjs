import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createPool } from '../../src/db.js';
import { defaultFixtureRoot, parseData, seed } from '../../src/import-data.js';
import { migrationNames, runMigrations } from '../../scripts/migrate.js';
import { pool } from '../../test-support/functional.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const migrationsRoot = path.join(backendRoot, 'db/migrations');
const databaseUrl = process.env.DATABASE_URL;

async function countSeedRows() {
  const result = await pool.query(`SELECT
    (SELECT count(*) FROM accounts) accounts,
    (SELECT count(*) FROM customers) customers,
    (SELECT count(*) FROM cards) cards,
    (SELECT count(*) FROM card_xrefs) xrefs,
    (SELECT count(*) FROM transactions) transactions,
    (SELECT count(*) FROM transaction_types) types,
    (SELECT count(*) FROM transaction_categories) categories,
    (SELECT count(*) FROM category_balances) balances,
    (SELECT count(*) FROM disclosure_groups) disclosures,
    (SELECT count(*) FROM users) users`);
  return result.rows[0];
}

test('F-006 PostgreSQL advisory migration locking makes concurrent runners converge safely', async () => {
  const migrationsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'carddemo-concurrent-migrations-'));
  const name = '997_functional_concurrent_probe.sql';
  const table = 'functional_concurrent_migration_probe';
  const first = createPool({ connectionString: databaseUrl });
  const second = createPool({ connectionString: databaseUrl });
  try {
    for (const migration of await migrationNames(migrationsRoot)) await fs.copyFile(path.join(migrationsRoot, migration), path.join(migrationsDir, migration));
    await fs.writeFile(path.join(migrationsDir, name), `CREATE TABLE IF NOT EXISTS ${table} (id integer PRIMARY KEY);\n`);
    await pool.query(`DROP TABLE IF EXISTS ${table}`);
    await pool.query('DELETE FROM schema_migrations WHERE name=$1', [name]);

    const results = await Promise.allSettled([
      runMigrations({ pool: first, migrationsDir, log: null }),
      runMigrations({ pool: second, migrationsDir, log: null })
    ]);
    assert.deepEqual(results.map(result => result.status), ['fulfilled', 'fulfilled']);
    const applied = results.map(result => result.value).flat();
    assert.equal(applied.filter(value => value === name).length, 1, 'the advisory lock permits exactly one runner to apply the probe');
    assert.equal((await pool.query('SELECT count(*) FROM schema_migrations WHERE name=$1', [name])).rows[0].count, '1');
    assert.equal((await pool.query(`SELECT to_regclass('public.${table}') AS name`)).rows[0].name, table);
  } finally {
    await pool.query(`DROP TABLE IF EXISTS ${table}`);
    await pool.query('DELETE FROM schema_migrations WHERE name=$1', [name]);
    await Promise.all([first.end(), second.end()]);
    await fs.rm(migrationsDir, { recursive: true, force: true });
  }
});

test('F-007 seed is schema-compatible and idempotent, preserves FICO source values, and advances the transaction sequence', async () => {
  const expected = parseData({ fixtureRoot: defaultFixtureRoot });
  const before = await countSeedRows();
  await seed(pool);
  assert.deepEqual(await countSeedRows(), before, 're-seeding canonical fixtures must not duplicate relational rows');

  const customer = expected.customers.find(value => value.id === '000000001');
  assert.equal((await pool.query('SELECT fico FROM customers WHERE id=$1', [customer.id])).rows[0].fico, customer.fico);
  assert.equal((await pool.query("SELECT data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name='transactions' AND column_name='id'")).rows[0].data_type, 'numeric');
  assert.equal((await pool.query("SELECT count(*) FROM information_schema.table_constraints WHERE table_name='card_xrefs' AND constraint_type='FOREIGN KEY'")).rows[0].count, '3');

  const maximum = BigInt((await pool.query('SELECT max(id)::text AS id FROM transactions')).rows[0].id);
  const next = BigInt((await pool.query("SELECT nextval('transactions_id_seq')::text AS id")).rows[0].id);
  assert.equal(next, maximum + 1n, 'the sequence must issue a new 16-digit identifier after imported transaction IDs');
});
