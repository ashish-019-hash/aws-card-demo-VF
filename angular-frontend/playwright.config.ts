import { defineConfig, devices } from '@playwright/test';

function requireIsolatedE2eDatabase(url: string | undefined) {
  if (!url) throw new Error('TEST_DATABASE_URL is required for E2E tests; the suite refuses to use DATABASE_URL.');
  let databaseName = '';
  try { databaseName = decodeURIComponent(new URL(url).pathname).replace(/^\/+/, ''); } catch { throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL.'); }
  if (!/^carddemo_test_e2e_[a-z0-9_]+$/i.test(databaseName)) {
    throw new Error(`Refusing E2E database "${databaseName || '<missing>'}". Use a unique carddemo_test_e2e_<run-id> database; carddemo_test is not permitted.`);
  }
  return url;
}
const testDatabaseUrl = requireIsolatedE2eDatabase(process.env.TEST_DATABASE_URL);

const backendEnvironment = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  PORT: '3000',
  NODE_ENV: 'test',
  SESSION_SECRET: process.env.SESSION_SECRET || 'e2e-session-secret-that-is-long-enough-for-local-tests'
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'node ../angular-frontend/e2e/prepare-test-db.mjs && node src/server.js',
      cwd: '../express-backend',
      env: backendEnvironment,
      url: 'http://127.0.0.1:3000/health',
      timeout: 60_000,
      reuseExistingServer: false
    },
    {
      command: 'npm start',
      cwd: '.',
      url: 'http://127.0.0.1:4200',
      timeout: 90_000,
      reuseExistingServer: false
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /E-008-cross-browser-smoke\.spec\.ts/
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /E-008-cross-browser-smoke\.spec\.ts/
    }
  ]
});
