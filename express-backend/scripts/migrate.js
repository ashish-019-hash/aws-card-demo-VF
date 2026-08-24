import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool, withTransaction } from '../src/db.js';
const migrations = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../db/migrations');
const pool = createPool();
try {
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map(row => row.name));
  for (const name of (await fs.readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
    if (applied.has(name)) continue;
    const sql = await fs.readFile(path.join(migrations, name), 'utf8');
    await withTransaction(pool, async client => { await client.query(sql); await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]); });
    console.log(`Applied ${name}`);
  }
} finally { await pool.end(); }
