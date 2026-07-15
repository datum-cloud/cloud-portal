/**
 * Tier 1 — local plugin registry (the CRD registration path).
 *
 * global-setup brought up the kwok registry (`task devenv:up`) and launched the
 * portal with PLUGIN_REGISTRY_KUBECONFIG=.devenv/kubeconfig (no PORTAL_PLUGINS).
 * This tier exercises the real Kubernetes watch/discovery machinery: applying a
 * PortalPlugin CR makes the plugin appear; deleting it makes the plugin vanish.
 *
 * Prerequisites (see e2e/plugins/README.md): everything Tier 0 needs, PLUS
 *   - kwokctl installed
 *   - devenv Taskfile: `task devenv:up` / `devenv:register` / `devenv:down`
 * When those are absent, global-setup marks the tier disabled and every test
 * here skips with a clear reason (honest, not a silent pass).
 *
 * SAFETY: the only mutations are local (kwok PortalPlugin CRs). The remote
 * platform is only ever read.
 */
import { EXTENSION_NAV_PROJECT, EXTENSION_PAGE_PROJECT } from '../../app/modules/plugins/types';
import { test, expect, fetchPlugins, extensionCounts } from './fixtures';
import { CMD_DEVENV_REGISTER, REPO_ROOT } from './lib/config';
import { deletePortalPlugin, portalPluginExists } from './lib/kube';
import { sel } from './lib/selectors';
import { execFileSync } from 'node:child_process';

function registerPlugin() {
  execFileSync('/bin/sh', ['-c', CMD_DEVENV_REGISTER], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    timeout: 120_000,
  });
}

test.describe.serial('Tier 1: CRD registration path', () => {
  test.beforeEach(async ({ state }) => {
    test.skip(
      !state.tier1Enabled,
      `Tier 1 unavailable: ${state.tier1SkipReason ?? 'prerequisites missing'}`
    );
  });

  test.beforeAll(async () => {
    // Guarantee a clean starting point regardless of prior runs.
    try {
      deletePortalPlugin(process.env.E2E_TIER1_PLUGIN_NAME ?? 'sample.miloapis.com');
    } catch {
      /* tier may be disabled; beforeEach handles the skip */
    }
  });

  test('nav does not show the plugin before any CR is registered', async ({
    page,
    projectHomeUrl,
    state,
  }) => {
    await page.goto(projectHomeUrl);
    await expect(page.locator(sel.navItem(state.tier1Slug))).toHaveCount(0);
  });

  test('applying the PortalPlugin CR makes the nav item appear (watch-driven)', async ({
    page,
    projectHomeUrl,
    state,
    request,
  }) => {
    registerPlugin();
    expect(portalPluginExists(state.tier1PluginName)).toBe(true);

    // Nav is client-fetched from /api/plugins; reload until the portal's watch
    // has ingested the CR and the query refetches.
    await expect(async () => {
      await page.goto(projectHomeUrl);
      await expect(page.locator(sel.navItem(state.tier1Slug)).first()).toBeVisible({
        timeout: 3_000,
      });
    }).toPass({ timeout: 60_000 });

    // Registry health reflects the registered plugin + its extension counts.
    const plugins = await fetchPlugins(request);
    const entry = plugins.find((p) => p.slug === state.tier1Slug);
    expect(entry, `plugin slug=${state.tier1Slug} present in /api/plugins`).toBeTruthy();
    const counts = extensionCounts(entry!);
    expect(counts[EXTENSION_NAV_PROJECT] ?? 0).toBeGreaterThanOrEqual(1);
    expect(counts[EXTENSION_PAGE_PROJECT] ?? 0).toBeGreaterThanOrEqual(1);
  });

  test('deleting the CR removes the nav item and 404s the mount', async ({
    page,
    projectHomeUrl,
    pluginPageUrl,
    state,
  }) => {
    deletePortalPlugin(state.tier1PluginName);
    expect(portalPluginExists(state.tier1PluginName)).toBe(false);

    // Nav item disappears once the delete event propagates.
    await expect(async () => {
      await page.goto(projectHomeUrl);
      await expect(page.locator(sel.navItem(state.tier1Slug))).toHaveCount(0);
    }).toPass({ timeout: 60_000 });

    // The mount URL now fail-closes: an unknown slug throws NotFoundError in the
    // server loader, so the document response is a real 404.
    const response = await page.goto(pluginPageUrl(state.tier1Slug, state.sampleHomePath));
    await expect(page.locator(sel.samplePage)).toHaveCount(0);
    expect(response?.status(), 'unknown-slug mount returns HTTP 404').toBe(404);
  });

  test.afterAll(async () => {
    try {
      deletePortalPlugin(process.env.E2E_TIER1_PLUGIN_NAME ?? 'sample.miloapis.com');
    } catch {
      /* best effort */
    }
  });
});
