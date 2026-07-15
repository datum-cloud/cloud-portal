/**
 * Generic Portal Plugin e2e — driven ENTIRELY by plugin-e2e.config.ts.
 *
 * You should not need to edit this file for your own plugin: it applies your
 * PortalPlugin CR, asserts the portal discovers it (Ready=True), that your nav
 * items appear and your pages render, and that deleting the CR unloads the
 * plugin (nav gone, mount 404s). Everything specific to your plugin lives in
 * plugin-e2e.config.ts.
 *
 * SAFETY: read-only against the remote platform (log in, list, navigate). The
 * only mutations are the local kwok registry (your CR) — never the platform.
 */
import { applyCR, deleteCR, portalPluginReady, readState, type RuntimeState } from './harness';
import { pluginE2EConfig as cfg } from './plugin-e2e.config';
import { test, expect } from '@playwright/test';

// Read lazily in beforeAll — runtime-state.json only exists after global-setup.
let state: RuntimeState;
const home = () => `/project/${state.projectId}/home`;
const mount = (p: string) => `/project/${state.projectId}/services/${cfg.slug}/${p}`;
const navSelector = (p: string) => `a[href*="/services/${cfg.slug}/${p}"]`;

test.describe.serial(`Portal plugin: ${cfg.slug}`, () => {
  test.beforeAll(() => {
    state = readState();
    // Clean slate regardless of prior runs.
    try {
      deleteCR(cfg.crManifestPath);
    } catch {
      /* ignore */
    }
  });
  test.afterAll(() => {
    try {
      deleteCR(cfg.crManifestPath);
    } catch {
      /* ignore */
    }
  });

  test('nav is absent before the plugin is registered', async ({ page }) => {
    await page.goto(home());
    await expect(page.locator(navSelector(cfg.navItems[0].path))).toHaveCount(0);
  });

  test('registering the CR discovers the plugin, shows its nav, and renders its pages', async ({
    page,
  }) => {
    applyCR(cfg.crManifestPath);

    // The portal watches the registry and writes status back once discovered.
    await expect.poll(() => portalPluginReady(cfg.manifestName), { timeout: 30_000 }).toBe(true);

    // Nav items appear (client-fetched from /api/plugins; reload until present).
    await expect(async () => {
      await page.goto(home());
      for (const item of cfg.navItems) {
        await expect(page.locator(navSelector(item.path)).first()).toBeVisible({ timeout: 3_000 });
      }
    }).toPass({ timeout: 60_000 });

    // Each declared page renders its ready selector under the mount.
    for (const p of cfg.pages) {
      await page.goto(mount(p.path));
      await expect(
        page.locator(p.readySelector),
        `page "${p.path}" should render ${p.readySelector}`
      ).toBeVisible();
    }
  });

  test('deleting the CR unloads the plugin (nav gone, mount 404s)', async ({ page }) => {
    deleteCR(cfg.crManifestPath);

    await expect(async () => {
      await page.goto(home());
      await expect(page.locator(navSelector(cfg.navItems[0].path))).toHaveCount(0);
    }).toPass({ timeout: 60_000 });

    const res = await page.goto(mount(cfg.pages[0].path));
    expect(res?.status(), 'mount of an unregistered slug returns 404').toBe(404);
  });
});
