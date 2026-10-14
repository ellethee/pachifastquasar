import { defineConfig, devices } from '@playwright/test'

const APP_PORT = Number(process.env.E2E_APP_PORT ?? 9100)
const BACKEND_PORT = Number(process.env.COMPAT_PORT ?? 8030)

/**
 * Playwright config: serves the built playground (`pnpm build:playground`, auth enabled) with a tiny static server
 * that proxies `/api` to the compat backend (`compat/backend.sh all`, started by the caller).
 * Browser: set `E2E_CHANNEL=chrome` to use the system Chrome, otherwise the Playwright Chromium (`pnpm e2e:install`).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: 'retain-on-failure',
    locale: 'en-US',
    ...devices['Desktop Chrome'],
    ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://127.0.0.1:${APP_PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { E2E_APP_PORT: String(APP_PORT), COMPAT_PORT: String(BACKEND_PORT) },
  },
})
