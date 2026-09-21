import { defineConfig, devices } from '@playwright/test'

/**
 * E2E suite runs against the REAL Vite dev server + REAL Spring Boot backend
 * (http://localhost:8080, already running with seeded Postgres data — see
 * e2e/README-like notes in e2e/TRACEABILITY.md and the repo root README).
 *
 * The backend is NOT started by this config (an instance is already running and must
 * not be restarted by the test run). Only the frontend dev server is managed here, and
 * only if one isn't already listening on 5173 (reuseExistingServer).
 *
 * The whole suite runs single-worker / non-parallel: several specs mutate shared
 * backend-seeded rows (accounts, cards, users) and must not race each other or a
 * developer's own manual testing session against the same backend.
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/reports/html', open: 'never' }],
    ['json', { outputFile: 'e2e/reports/results.json' }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
