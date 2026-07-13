import { STORAGE_STATE } from './e2e/harness';
import { pluginE2EConfig } from './e2e/plugin-e2e.config';
import { defineConfig, devices } from '@playwright/test';

/**
 * Standalone Playwright config for testing this plugin against a real portal.
 * Run with `bun run test:e2e` (see package.json). Servers are orchestrated in
 * e2e/global-setup.ts (token → dev-session → storageState; kwok registry; plugin
 * + portal), and stopped in e2e/global-teardown.ts.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: './e2e/.artifacts/test-results',

  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  reporter: [['list'], ['html', { open: 'never', outputFolder: './e2e/.artifacts/report' }]],

  use: {
    baseURL: `http://localhost:${pluginE2EConfig.portalPort}`,
    storageState: STORAGE_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
