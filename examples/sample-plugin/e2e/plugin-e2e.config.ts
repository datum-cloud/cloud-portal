/**
 * Plugin e2e configuration — THIS is the file you edit for your own plugin.
 *
 * The harness and spec are generic: they read only this config, so testing your
 * plugin against a real portal is a matter of filling in the values below (no
 * spec code to write). See README → "Testing your plugin against the portal".
 *
 * Ports/paths note (in-tree sample): this reuses the sample plugin's fixed
 * preview port (7777) and the portal dev port (3000), plus the shared
 * `.devenv` kwok cluster from PORTAL_REPO_DIR. So do NOT run this at the same
 * time as the cloud-portal repo's own `test:e2e:plugins` suite — they share
 * those ports and that cluster. Override PORTAL_REPO_DIR / E2E_PORTAL_PORT if
 * you need to.
 */
import type { PluginE2EConfig } from './harness';

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);

export const pluginE2EConfig: PluginE2EConfig = {
  // Identity — the plugin's URL slug and its PortalPlugin/manifest name.
  slug: 'sample',
  manifestName: 'sample.miloapis.com',

  // Your PortalPlugin CR (relative to the plugin package root). Applied/deleted
  // by the spec to drive registration → discovery → unload.
  crManifestPath: 'e2e/portalplugin.yaml',

  // Nav items your plugin contributes (asserted to appear once registered).
  navItems: [
    { path: 'platform', title: 'Platform data' },
    { path: 'home', title: 'Sample Plugin' },
  ],

  // Pages to smoke-test: navigate to each and wait for its ready selector.
  pages: [
    { path: 'home', readySelector: '[data-testid="sample-plugin-page"]' },
    { path: 'platform', readySelector: '[data-testid="sample-platform-page"]' },
  ],

  // How to serve your BUILT plugin. Build first so `vite preview` serves fresh
  // assets; the sample's `preview` script runs `vite preview` (:7777). Every
  // API call your plugin issues goes through the portal's Milo control-plane
  // proxy — there is no plugin-declared backend to start here.
  pluginCommand: 'bun run build && bun run preview',
  pluginReadyUrl: `http://localhost:${num(process.env.E2E_PLUGIN_PORT, 7777)}/plugin-manifest.json`,

  // Port the portal runs on for this test session.
  portalPort: num(process.env.E2E_PORTAL_PORT, 3000),
};
