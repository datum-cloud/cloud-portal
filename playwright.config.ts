import { STORAGE_STATE, TIER0_PORTAL_URL, TIER1_PORTAL_URL } from './e2e/plugins/lib/config';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Portal Plugin System e2e suite.
 *
 * Scoped entirely to `e2e/` so the existing Cypress setup (cypress.config.ts,
 * cypress/**) is untouched. Run with `bun run test:e2e:plugins`.
 *
 * Two projects, one per portal tier, each with its own port/baseURL:
 *   - tier0-static: portal launched with PORTAL_PLUGINS (static override).
 *   - tier1-crd:    portal launched with PLUGIN_REGISTRY_KUBECONFIG (kwok).
 * Both authenticate with the single storageState produced by global-setup —
 * the session cookie is host-scoped, so it validates on both localhost ports.
 *
 * Servers are orchestrated in global-setup / global-teardown (not `webServer`)
 * because the two portals need different env and Tier 1 is conditionally
 * skipped when kwok/devenv are unavailable.
 */
export default defineConfig({
  testDir: './e2e/plugins',
  testMatch: '**/*.spec.ts',
  outputDir: './test-results',

  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  timeout: 60_000,
  expect: { timeout: 15_000 },

  globalSetup: './e2e/plugins/global-setup.ts',
  globalTeardown: './e2e/plugins/global-teardown.ts',

  reporter: [['list'], ['html', { open: 'never', outputFolder: './playwright-report' }]],

  use: {
    storageState: STORAGE_STATE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },

  projects: [
    {
      // Both Tier 0 files (static override + service console) hit the :3000 portal.
      name: 'tier0-static',
      testMatch: '**/tier0-*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: TIER0_PORTAL_URL },
    },
    {
      name: 'tier1-crd',
      testMatch: '**/tier1-*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: TIER1_PORTAL_URL },
    },
  ],
});
