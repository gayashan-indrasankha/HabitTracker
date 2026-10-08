import { defineConfig, devices } from '@playwright/test';

const port = process.env.HABITFLOW_E2E_ISOLATED ? 3100 : 3000;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI || process.env.HABITFLOW_E2E_ISOLATED ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: process.env.HABITFLOW_E2E_ISOLATED ? `npm run dev -- --port ${port}` : 'npm run dev',
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI && !process.env.HABITFLOW_E2E_ISOLATED,
  },
});
