import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../src/db.js';
import { migrationNames, runMigrations } from '../scripts/migrate.js';
import { assertConnectedTestDatabase, validateTestDatabaseUrl } from '../scripts/test-db.js';

const databaseUrl = process.env.DATABASE_URL;
validateTestDatabaseUrl(databaseUrl);
const pool = createPool({ connectionString: databaseUrl });
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(backendRoot, 'db/migrations');
let migrationsDir;

async function cleanReplayArtifacts() {
  await pool.query('DROP TABLE IF EXISTS migration_replay_probe');
  const migrationsTable = await pool.query("SELECT to_regclass('public.schema_migrations') AS name");
  if (migrationsTable.rows[0]?.name) {
    await pool.query("DELETE FROM schema_migrations WHERE name IN ('998_replay_probe.sql', '999_rollback_probe.sql')");
  }
}

before(async () => {
  await assertConnectedTestDatabase(pool, databaseUrl);
  // A prior interrupted run may have left the replay probe or migration records behind.
  await cleanReplayArtifacts();
});

after(async () => {
  try {
    await cleanReplayArtifacts();
  } finally {
    try {
      if (migrationsDir) await fs.rm(migrationsDir, { recursive: true, force: true });
    } finally {
      await pool.end();
    }
  }
});

test('migrations replay safely and roll back a partially failing migration', async () => {
  migrationsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'carddemo-migrations-'));
  for (const name of await migrationNames(sourceDir)) await fs.copyFile(path.join(sourceDir, name), path.join(migrationsDir, name));
  await fs.writeFile(path.join(migrationsDir, '998_replay_probe.sql'), 'CREATE TABLE migration_replay_probe (id integer PRIMARY KEY);\n');

  const applied = await runMigrations({ pool, migrationsDir, log: null });
  assert.deepEqual(applied, ['998_replay_probe.sql']);
  assert.deepEqual(await runMigrations({ pool, migrationsDir, log: null }), []);

  await fs.writeFile(path.join(migrationsDir, '999_rollback_probe.sql'), 'ALTER TABLE migration_replay_probe ADD COLUMN must_rollback text;\nSELECT invalid_sql();\n');
  await assert.rejects(runMigrations({ pool, migrationsDir, log: null }), /invalid_sql/);
  assert.equal((await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='migration_replay_probe' AND column_name='must_rollback'")).rowCount, 0);
  assert.equal((await pool.query("SELECT 1 FROM schema_migrations WHERE name='999_rollback_probe.sql'")).rowCount, 0);
});
