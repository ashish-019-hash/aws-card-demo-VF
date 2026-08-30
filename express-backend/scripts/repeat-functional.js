import { spawnSync } from 'node:child_process';
import { createPool } from '../src/db.js';
import { databaseName, validateTestDatabaseUrl } from './test-db.js';
import { assertIsolatedTestDatabaseUrl, quoteIdentifier } from '../qa/bin/isolated-test-db.mjs';

const sourceUrl = process.env.TEST_DATABASE_URL;
validateTestDatabaseUrl(sourceUrl);
const iterations = Number(process.env.REPEAT_ITERATIONS || 10);
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 20) throw new Error('REPEAT_ITERATIONS must be an integer from 1 through 20.');

const suites = [
  'functional/business/accounts-customers.mjs',
  'functional/business/cards.mjs',
  'functional/business/reports.mjs',
  'functional/business/admin-crud.mjs',
  'functional/business/cleanup-retention.mjs',
  'functional/concurrency/transactions-idempotency.mjs',
  'functional/concurrency/billing-atomicity.mjs',
  'functional/concurrency/admin-lock-order.mjs'
];
const maintenance = new URL(sourceUrl);
maintenance.pathname = '/postgres';
const databasePrefix = databaseName(sourceUrl).replace(/[^A-Za-z0-9_]/g, '_').slice(0, 35);
const failures = [];

async function withIsolatedDatabase(iteration, callback) {
  const name = `${databasePrefix}_f022_${process.pid}_${iteration}`.slice(0, 63);
  const isolated = new URL(sourceUrl);
  isolated.pathname = `/${name}`;
  assertIsolatedTestDatabaseUrl(isolated.toString());
  const admin = createPool({ connectionString: maintenance.toString() });
  let created = false;
  try {
    await admin.query(`CREATE DATABASE ${quoteIdentifier(name)}`);
    created = true;
    await callback(isolated.toString(), name);
  } finally {
    try {
      if (created) {
        await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [name]);
        await admin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)}`);
      }
    } finally {
      await admin.end();
    }
  }
}

for (let iteration = 1; iteration <= iterations; iteration += 1) {
  await withIsolatedDatabase(iteration, async (isolatedUrl, database) => {
    console.log(`F-022 iteration ${iteration}/${iterations}: isolated database ${database}`);
    for (const suite of suites) {
      const result = spawnSync(process.execPath, ['scripts/test-db.js', suite], {
        cwd: new URL('..', import.meta.url),
        stdio: 'inherit',
        timeout: 90_000,
        env: { ...process.env, TEST_DATABASE_URL: isolatedUrl }
      });
      if (result.error || result.status !== 0) {
        failures.push({ iteration, suite, reason: result.error?.message || (result.signal ? `terminated by ${result.signal}` : `exit ${result.status}`) });
      }
    }
  });
}

if (failures.length) {
  console.error(`F-022 repeatability failed in ${failures.length} suite run(s):`);
  for (const failure of failures) console.error(`- iteration ${failure.iteration}, ${failure.suite}: ${failure.reason}`);
  process.exitCode = 1;
} else {
  console.log(`F-022 repeatability passed: ${suites.length} targeted suites across ${iterations} isolated iteration(s).`);
}
