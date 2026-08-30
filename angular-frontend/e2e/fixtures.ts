import { execFileSync } from 'node:child_process';
import { expect, test as base } from '@playwright/test';

function resetIsolatedE2eDatabase() {
  const connectionString = process.env['TEST_DATABASE_URL'];
  if (!connectionString) throw new Error('TEST_DATABASE_URL is required for E2E database reset.');
  const databaseName = decodeURIComponent(new URL(connectionString).pathname).replace(/^\/+/, '');
  if (!/^carddemo_test_e2e_[a-z0-9_]+$/i.test(databaseName)) {
    throw new Error(`Refusing E2E database "${databaseName || '<missing>'}". Use a unique carddemo_test_e2e_<run-id> database; carddemo_test is not permitted.`);
  }
  execFileSync(process.execPath, ['e2e/prepare-test-db.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit'
  });
}

export const test = base.extend<{ resetDatabase: void }>({
  resetDatabase: [async ({}, use) => {
    resetIsolatedE2eDatabase();
    await use();
  }, { auto: true }]
});

export { expect };
