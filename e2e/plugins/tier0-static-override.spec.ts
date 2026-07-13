/**
 * Tier 0 — static override (no Kubernetes).
 *
 * The portal is launched by global-setup with:
 *   PORTAL_PLUGINS=sample=http://localhost:7777  AUTH_DEV_TOKEN_EXCHANGE=1
 * and the BUILT sample plugin is served on :7777 (`vite preview` of dist/).
 * This exercises the production Module Federation loading path with discovery
 * short-circuited.
 *
 * Prerequisites (see e2e/plugins/README.md):
 *   - datumctl session (a real, read-only platform login)
 *   - portal-core: registry + static source + /api/auth/dev-session + /api/plugins
 *   - portal-runtime: catch-all mount, PluginOutlet, nav merge, host testids
 *   - devenv: examples/sample-plugin built + served on :7777
 *
 * SAFETY: read-only against the remote platform (log in, list, navigate only).
 */
import {
  EXTENSION_NAV_PROJECT,
  EXTENSION_PAGE_PROJECT,
  EXTENSION_CARD_PROJECT_HOME,
} from '../../app/modules/plugins/types';
import { test, expect, fetchPlugins, extensionCounts } from './fixtures';
import { sel } from './lib/selectors';

test.describe('Tier 0: static plugin override', () => {
  test('sample plugin nav item appears in the project sidebar', async ({
    page,
    projectHomeUrl,
    state,
  }) => {
    await page.goto(projectHomeUrl);
    await expect(
      page.locator(sel.navItemPath(state.sampleSlug, state.sampleHomePath)).first()
    ).toBeVisible();
  });

  test('clicking the nav item renders the remote component and the counter works', async ({
    page,
    projectHomeUrl,
    state,
  }) => {
    await page.goto(projectHomeUrl);
    await page.locator(sel.navItemPath(state.sampleSlug, state.sampleHomePath)).first().click();

    // Navigated into the plugin mount.
    await expect(page).toHaveURL(
      new RegExp(`/services/${state.sampleSlug}/${state.sampleHomePath}`)
    );

    // Remote component rendered (heading from the federated module).
    await expect(page.locator(sel.samplePage)).toBeVisible();
    await expect(page.locator(sel.sampleHeading)).toHaveText('Sample Plugin');

    // Counter increments — proves the plugin runs on the host's React singleton
    // (its useState works because module federation shared a single React).
    const counter = page.locator(sel.sampleCounter);
    await expect(counter).toContainText('Clicked 0 times');
    await counter.click();
    await expect(counter).toContainText('Clicked 1 time');
  });

  test('detail page loads via a named-export coderef and :param routing', async ({
    page,
    projectHomeUrl,
    state,
  }) => {
    await page.goto(projectHomeUrl);
    await page.locator(sel.navItemPath(state.sampleSlug, state.sampleHomePath)).first().click();
    await expect(page.locator(sel.samplePage)).toBeVisible();

    // Follow the in-plugin link to the detail route (items/:itemId). This
    // exercises a NAMED-export $codeRef (SampleDetail.DetailView) and a routed
    // :param, both resolved through the host's shared react-router singleton.
    await page.locator(sel.sampleDetailLink).click();
    await expect(page).toHaveURL(new RegExp(`/services/${state.sampleSlug}/items/42`));
    await expect(page.locator(sel.sampleDetailHeading)).toHaveText('Sample Item Detail');
    await expect(page.locator(sel.sampleDetailParam)).toContainText('itemId: 42');
  });

  test('the dev-plugin badge is visible for a statically-overridden plugin', async ({
    page,
    pluginPageUrl,
    state,
  }) => {
    await page.goto(pluginPageUrl(state.sampleSlug, state.sampleHomePath));
    await expect(page.locator(sel.devBadge).or(page.getByText(sel.devBadgeText))).toBeVisible();
  });

  test('a bogus sub-path under a known plugin shows the in-app not-found', async ({
    page,
    pluginPageUrl,
    state,
  }) => {
    // Known slug + unmatched sub-path: portal-runtime returns a 200 shell and
    // the client renders the in-app not-found (a bogus SLUG would 404 instead —
    // covered by the Tier 1 delete test).
    await page.goto(pluginPageUrl(state.sampleSlug, 'this-page-does-not-exist'));
    // .first(): the testid container and its inner text can both match at
    // once, which strict mode rejects; either one proves the not-found state.
    await expect(
      page.locator(sel.notFound).or(page.getByText(sel.notFoundText)).first()
    ).toBeVisible();
    // The real plugin page must NOT have rendered for a bogus path.
    await expect(page.locator(sel.samplePage)).toHaveCount(0);
  });

  test('GET /api/plugins reflects the sample plugin and its extension counts', async ({
    request,
    state,
  }) => {
    const plugins = await fetchPlugins(request);
    const sample = plugins.find((p) => p.slug === state.sampleSlug);
    expect(sample, `sample plugin (slug=${state.sampleSlug}) present in /api/plugins`).toBeTruthy();
    expect(sample!.devMode, 'static-override plugin is dev-sourced').toBe(true);

    const counts = extensionCounts(sample!);
    expect(counts[EXTENSION_NAV_PROJECT] ?? 0).toBeGreaterThanOrEqual(1);
    expect(counts[EXTENSION_PAGE_PROJECT] ?? 0).toBeGreaterThanOrEqual(1);
    expect(counts[EXTENSION_CARD_PROJECT_HOME] ?? 0).toBeGreaterThanOrEqual(1);
  });
});
