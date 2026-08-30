import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from '../src/db.js';
import { runMigrations } from './migrate.js';
import { assertTestDatabaseName, databaseName, validateTestDatabaseUrl } from '../qa/bin/test-db-safety.mjs';

export { assertTestDatabaseName, databaseName, validateTestDatabaseUrl } from '../qa/bin/test-db-safety.mjs';
const scriptPath = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(scriptPath), '..');

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
  'test/api.test.js', 'test/db-guard.test.js', 'test/import-data.test.js',
  'functional/migration-replay.mjs',
  'functional/api-safety.mjs', 'functional/financial-workflows.mjs', 'functional/reports-admin.mjs',
  'functional/data-contract/import-and-ebcdic.mjs', 'functional/data-contract/migrations-and-seed.mjs',
  'functional/data-contract/openapi-contract.mjs', 'functional/data-contract/contract-fuzz.mjs', 'functional/security-contract/api-errors-and-sessions.mjs',
  'functional/security-contract/global-u-policy.mjs',
  'functional/business/accounts-customers.mjs', 'functional/business/cards.mjs', 'functional/business/reports.mjs',
  'functional/business/admin-crud.mjs', 'functional/business/cleanup-retention.mjs',
  'functional/concurrency/transactions-idempotency.mjs', 'functional/concurrency/billing-atomicity.mjs',
  'functional/concurrency/admin-lock-order.mjs'
];
const resolveTestFile = file => path.resolve(backendRoot, file);

export function runTestFiles(files, { connectionString, spawn = spawnSync } = {}) {
  const failures = [];
  for (const file of files) {
    const result = spawn(process.execPath, ['--test', '--test-concurrency=1', file], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: connectionString }
    });
    if (result.error) {
      failures.push({ file, error: result.error });
      continue;
    }
    if (result.status === null || result.signal || result.status !== 0) failures.push({ file, status: result.status, signal: result.signal });
  }
  return failures;
}

export async function runTests(connectionString = process.env.TEST_DATABASE_URL, testFiles = []) {
  const pool = await prepareTestDatabase(connectionString);
  try {
    await runMigrations({ pool });
  } finally {
    await pool.end();
  }
  const failures = runTestFiles((testFiles.length ? testFiles : defaultTestFiles).map(resolveTestFile), { connectionString });
  if (failures.length) {
    for (const failure of failures) console.error(`Test file failed: ${failure.file}${failure.signal ? ` (${failure.signal})` : failure.status === null ? '' : ` (exit ${failure.status})`}`);
    process.exitCode = 1;
  }
  return failures;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await runTests(process.env.TEST_DATABASE_URL, process.argv.slice(2));
}
