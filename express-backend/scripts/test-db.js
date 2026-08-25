import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from '../src/db.js';
import { runMigrations } from './migrate.js';

const testDatabaseName = /(^|[-_])test($|[-_])|_test$/i;
const scriptPath = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(scriptPath), '..');

export function databaseName(connectionString) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('TEST_DATABASE_URL must use the postgres or postgresql protocol.');
  const name = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!name) throw new Error('TEST_DATABASE_URL must include a database name.');
  return name;
}

export function assertTestDatabaseName(name) {
  if (!testDatabaseName.test(name)) throw new Error(`Refusing to use non-test database "${name}". Use a database name containing "test" as a distinct marker.`);
  return name;
}

export function validateTestDatabaseUrl(connectionString) {
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required; refusing to run tests against DATABASE_URL.');
  assertTestDatabaseName(databaseName(connectionString));
  return connectionString;
}

export async function assertConnectedTestDatabase(pool, connectionString) {
  const expected = assertTestDatabaseName(databaseName(connectionString));
  const result = await pool.query('SELECT current_database() AS name');
  const actual = assertTestDatabaseName(result.rows[0]?.name || '');
  if (actual !== expected) throw new Error(`Refusing to run tests: TEST_DATABASE_URL names "${expected}" but the server selected "${actual}".`);
  return actual;
}

export async function prepareTestDatabase(connectionString = process.env.TEST_DATABASE_URL) {
  validateTestDatabaseUrl(connectionString);
  const pool = createPool({ connectionString });
  try {
    await assertConnectedTestDatabase(pool, connectionString);
  } catch (error) {
    await pool.end();
    throw error;
  }
  return pool;
}

const defaultTestFiles = [
  'test/api.test.js', 'test/db-guard.test.js', 'test/import-data.test.js', 'functional/migration-replay.mjs',
  'functional/api-safety.mjs', 'functional/financial-workflows.mjs', 'functional/reports-admin.mjs'
];
const resolveTestFile = file => path.resolve(backendRoot, file);

export async function runTests(connectionString = process.env.TEST_DATABASE_URL, testFiles = []) {
  const pool = await prepareTestDatabase(connectionString);
  try {
    await runMigrations({ pool });
  } finally {
    await pool.end();
  }
  const files = (testFiles.length ? testFiles : defaultTestFiles).map(resolveTestFile);
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
    cwd: backendRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: connectionString }
  });
  if (result.error) throw result.error;
  if (result.status === null || result.signal) throw new Error(`Test process ended without a normal exit status${result.signal ? ` (signal ${result.signal})` : ''}.`);
  if (result.status !== 0) process.exitCode = result.status;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await runTests(process.env.TEST_DATABASE_URL, process.argv.slice(2));
}
