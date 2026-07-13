/**
 * Tier 0 — service console (elaborated sample plugin + backend proxy).
 *
 * The portal is launched with PORTAL_PLUGINS_JSON declaring the sample plugin
 * plus a proxy alias (`api` → the sample backend on :7778, UserToken). The
 * plugin's Instances pages fetch through the portal's same-origin proxy
 * (`/api/plugins/sample/proxy/api/*`) — the browser never talks to :7778. The
 * platform-data page reads DNS zones through the portal's existing
 * control-plane proxy (`/api/proxy`), which is strictly read-only.
 *
 * These specs run only when the service console is available (devenv's backend
 * #6 + portal-core's PORTAL_PLUGINS_JSON/proxy support #7). Otherwise they skip
 * with a clear reason and the original Tier 0 specs still run.
 *
 * SAFETY: read-only against the REMOTE platform. Restart mutations hit ONLY the
 * local sample backend; the platform-data page only lists (GET) DNS zones.
 */
import { test, expect, fetchPlugins } from './fixtures';
import { proxyPathPrefix } from './lib/config';
import { sel } from './lib/selectors';

test.describe('Tier 0: service console (backend proxy)', () => {
  test.beforeEach(async ({ state }) => {
    test.skip(
      !state.serviceConsoleEnabled,
      `service console unavailable: ${state.serviceConsoleSkipReason ?? 'prerequisites pending (#6/#7)'}`
    );
  });

  test('Instances nav item opens a list whose rows come through the portal proxy', async ({
    page,
    projectHomeUrl,
    state,
  }) => {
    const proxyPrefix = proxyPathPrefix(state.sampleSlug, state.proxyAlias);
    const proxyReqs: string[] = [];
    const directBackendReqs: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.includes(proxyPrefix)) proxyReqs.push(u);
      if (/localhost:7778|127\.0\.0\.1:7778/.test(u)) directBackendReqs.push(u);
    });

    // Reach the Instances page via its sidebar nav item.
    await page.goto(projectHomeUrl);
    const navItem = page.locator(sel.navItemPath(state.sampleSlug, state.instancesPath)).first();
    await expect(navItem).toBeVisible();
    await navItem.click();

    await expect(page.locator(sel.instancesPage)).toBeVisible();
    await expect(page.locator(sel.instanceRow).first()).toBeVisible();

    // Data came through the portal's same-origin proxy, never the backend origin.
    expect(
      proxyReqs.length,
      'instance data fetched via /api/plugins/<slug>/proxy/<alias>/*'
    ).toBeGreaterThan(0);
    expect(directBackendReqs, 'browser must never hit the backend origin directly').toHaveLength(0);

    // The backend echoes that the portal injected the session bearer — proves
    // UserToken mediation (the browser never holds or sends the backend token).
    await expect(page.locator(sel.instancesAuthBadge)).toContainText(/forwarded/i);
  });

  test('clicking an instance row opens its detail via :param routing', async ({
    page,
    pluginPageUrl,
    state,
  }) => {
    await page.goto(pluginPageUrl(state.sampleSlug, state.instancesPath));
    const firstRow = page.locator(sel.instanceRow).first();
    await expect(firstRow).toBeVisible();
    // The row's name cell is a react-router <Link> to the detail route.
    await firstRow.getByRole('link').first().click();

    await expect(page).toHaveURL(
      new RegExp(`/services/${state.sampleSlug}/${state.instancesPath}/`)
    );
    await expect(page.locator(sel.instanceDetail)).toBeVisible();
    await expect(page.locator(sel.instanceDetailName)).toBeVisible();
  });

  test('Restart flips the instance status and the UI updates (local backend only)', async ({
    page,
    pluginPageUrl,
    state,
  }) => {
    // Open the first instance's detail (where Restart lives) via the name link.
    await page.goto(pluginPageUrl(state.sampleSlug, state.instancesPath));
    await page.locator(sel.instanceRow).first().getByRole('link').first().click();
    const detail = page.locator(sel.instanceDetail);
    await expect(detail).toBeVisible();

    const status = detail.locator(sel.instanceStatus);
    await expect(status).toBeVisible();

    await page.locator(sel.instanceRestart).click();

    // Mutation → the backend sets status "Restarting" (invalidation refetches),
    // then flips back to "Running" after RESTART_MS (the detail query polls).
    await expect(status).toHaveText('Restarting');
    await expect(status).toHaveText('Running', { timeout: 12_000 });
  });

  test('platform-data page lists DNS zones (or the empty state), read-only', async ({
    page,
    pluginPageUrl,
    state,
  }) => {
    await page.goto(pluginPageUrl(state.sampleSlug, state.platformDataPath));
    await expect(page.locator(sel.platformDataPage)).toBeVisible();
    // Read-only through the control-plane proxy: rows or the empty state.
    await expect(
      page.locator(sel.platformDataRow).first().or(page.locator(sel.platformDataEmpty))
    ).toBeVisible();
  });

  test('the project-home card shows the live instance count', async ({ page, projectHomeUrl }) => {
    await page.goto(projectHomeUrl);
    const count = page.locator(sel.homeCardCount);
    await expect(count).toBeVisible();
    await expect(count).toContainText(/\d+/);
  });

  test('GET /api/plugins exposes the declared proxy alias', async ({ request, state }) => {
    const plugins = await fetchPlugins(request);
    const sample = plugins.find((p) => p.slug === state.sampleSlug);
    expect(sample, 'sample plugin present in /api/plugins').toBeTruthy();
    expect(sample!.proxyAliases, 'declared proxy alias is exposed').toContain(state.proxyAlias);
  });

  test('an UNDECLARED proxy alias is rejected (4xx)', async ({ request, state }) => {
    const res = await request.get(`${proxyPathPrefix(state.sampleSlug, 'undeclared-alias')}/ping`);
    expect(res.status(), 'undeclared alias must be rejected').toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
