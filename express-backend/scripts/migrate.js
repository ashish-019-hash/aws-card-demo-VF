import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool, withTransaction } from '../src/db.js';

const defaultMigrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');

export async function migrationNames(migrationsDir = defaultMigrationsDir) {
  return (await fs.readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort();
}

export async function runMigrations({ pool = createPool(), migrationsDir = defaultMigrationsDir, log = console.log } = {}) {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map(row => row.name));
  const completed = [];
  for (const name of await migrationNames(migrationsDir)) {
    if (applied.has(name)) continue;
    const sql = await fs.readFile(path.join(migrationsDir, name), 'utf8');
    await withTransaction(pool, async client => { await client.query(sql); await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]); });
    completed.push(name);
    log?.(`Applied ${name}`);
  }
  return completed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const pool = createPool();
  try {
    await runMigrations({ pool });
  } finally {
    await pool.end();
  }
}
