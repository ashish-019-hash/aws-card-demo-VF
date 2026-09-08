import { defineConfig, devices } from '@playwright/test'

const frontendPort = process.env.E2E_FRONTEND_PORT ?? '5173'
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${frontendPort}`

export default defineConfig({
  testDir: './e2e/specs',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  // Every run creates durable records. The runner enforces a clean database boundary
  // instead of replaying a failed destructive test against already-mutated data.
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${frontendPort}`,
    env: { ...process.env, E2E_API_BASE_URL: process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080' },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
