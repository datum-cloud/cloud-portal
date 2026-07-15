/**
 * Selectors for plugin-contributed UI, anchored to the current rendered DOM
 * (portal-runtime's PluginOutlet + host testids, and devenv's sample plugin
 * testids). Update here if those change.
 *
 * Host testids (portal-runtime): plugin-page, dev-plugin-badge, plugin-not-found.
 * The nav item has no testid (datum-ui NavMenu doesn't pass data-attrs through),
 * so it's targeted by its slug-scoped mount href. The sample plugin ships its
 * own sample-plugin-* testids.
 */

export const sel = {
  /**
   * A specific plugin's sidebar nav item — targeted by its mount href (the nav
   * link has no testid). Use `.first()`; a project-home card for the same plugin
   * can also link to the mount.
   */
  navItem: (slug: string) => `a[href*="/services/${slug}/"]`,
  /** A specific plugin nav item by its mount sub-path (e.g. platform). */
  navItemPath: (slug: string, path: string) => `a[href*="/services/${slug}/${path}"]`,

  /** Host wrapper around the rendered remote page (present during skeleton too). */
  pluginPage: '[data-testid="plugin-page"]',
  /** Host dev-plugin badge. */
  devBadge: '[data-testid="dev-plugin-badge"]',
  /** Host in-app not-found card (known slug + unmatched sub-path). */
  notFound: '[data-testid="plugin-not-found"]',

  // ── Sample plugin's own testids (devenv) ──────────────────────────────────
  /** Sample home page container. */
  samplePage: '[data-testid="sample-plugin-page"]',
  /** Sample home page <h1> ("Sample Plugin"). */
  sampleHeading: '[data-testid="sample-plugin-heading"]',
  /** Sample counter button ("Clicked N times"). */
  sampleCounter: '[data-testid="sample-plugin-counter"]',
  /** Sample params readout (projectId · serviceSlug · sub-path). */
  sampleParams: '[data-testid="sample-plugin-params"]',
  /** Link from home to the detail page ("Open item 42 →"). */
  sampleDetailLink: '[data-testid="sample-plugin-detail-link"]',
  /** Detail page container. */
  sampleDetail: '[data-testid="sample-plugin-detail"]',
  /** Detail page heading ("Sample Item Detail"). */
  sampleDetailHeading: '[data-testid="sample-plugin-detail-heading"]',
  /** Detail page param readout ("itemId: 42"). */
  sampleDetailParam: '[data-testid="sample-plugin-detail-param"]',

  // ── Milo control-plane data (DNS zones, via the portal's authenticated proxy) ─
  /** Platform-data (read-only control-plane / DNS zones) page container. */
  platformDataPage: '[data-testid="sample-platform-page"]',
  /** The DNS zones list. */
  platformDataList: '[data-testid="sample-platform-list"]',
  /** A DNS zone row. */
  platformDataRow: '[data-testid="sample-platform-zone"]',
  /** Empty-state shown when the project has no DNS zones. */
  platformDataEmpty: '[data-testid="sample-platform-empty"]',
  /** Home card showing the live DNS zone count. */
  homeCardCount: '[data-testid="sample-plugin-home-card-count"]',

  // Text fallbacks (used only if a host testid is ever absent).
  devBadgeText: /^Dev plugin$/,
  notFoundText: /Page not found/i,
} as const;
