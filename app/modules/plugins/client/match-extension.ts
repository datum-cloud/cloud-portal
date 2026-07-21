/**
 * Pure extension selection + path matching for the plugin mount — CLIENT-SAFE,
 * no React, no side effects, so it can be exercised directly by `bun test`.
 *
 * The mount receives a splat (`*`) path relative to
 * `/project/:projectId/services/<slug>/` and must decide which
 * `portal.page/project` extension renders. Matching, param extraction, and
 * specificity ranking are delegated to react-router's own matcher
 * (`matchRoutes`, which is built on `matchPath` and adds the ranking that makes
 * the longest / most-specific pattern win) so plugin paths resolve with exactly
 * the same semantics as host routes — `:params` and nested segments included.
 */
import {
  EXTENSION_CARD_PROJECT_HOME,
  EXTENSION_NAV_PROJECT,
  EXTENSION_PAGE_PROJECT,
  type CardProjectHomeExtension,
  type NavProjectExtension,
  type PageProjectExtension,
  type PluginExtension,
  type PublicPlugin,
} from '@/modules/plugins/types';
import { matchRoutes, type RouteObject } from 'react-router';

/**
 * The browser-safe manifest projection served on `PublicPlugin` — the same
 * shape the mount loader and `GET /api/plugins` return. Omits `sdk` (host-side
 * concern) but carries everything the client runtime renders from:
 * `remoteEntry`, `exposedModules`, and `extensions`.
 */
export type ClientPluginManifest = PublicPlugin['manifest'];

/** Result of matching a splat path against the plugin's page extensions. */
export interface PageMatch {
  page: PageProjectExtension;
  params: Record<string, string | undefined>;
}

// The manifest is schema-validated server-side before it reaches the browser
// (see app/modules/plugins/manifest.schema.ts), so these guards only narrow the
// discriminated union — they are not defending against malformed data.
function isPageExtension(ext: PluginExtension): ext is PageProjectExtension {
  return ext.type === EXTENSION_PAGE_PROJECT;
}
function isNavExtension(ext: PluginExtension): ext is NavProjectExtension {
  return ext.type === EXTENSION_NAV_PROJECT;
}
function isCardExtension(ext: PluginExtension): ext is CardProjectHomeExtension {
  return ext.type === EXTENSION_CARD_PROJECT_HOME;
}

/** Extract the `portal.page/project` extensions from a manifest. */
export function getPageExtensions(manifest: ClientPluginManifest): PageProjectExtension[] {
  return manifest.extensions.filter(isPageExtension);
}

/** Extract the `portal.nav/project` extensions, sorted by `order` then title. */
export function getNavExtensions(manifest: ClientPluginManifest): NavProjectExtension[] {
  return manifest.extensions.filter(isNavExtension).sort(byOrderThenTitle);
}

/** Extract the `portal.card/project-home` extensions, sorted by `order` then title. */
export function getCardExtensions(manifest: ClientPluginManifest): CardProjectHomeExtension[] {
  return manifest.extensions.filter(isCardExtension).sort(byOrderThenTitle);
}

function byOrderThenTitle(
  a: { properties: { order?: number; title: string } },
  b: { properties: { order?: number; title: string } }
): number {
  const orderA = a.properties.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.properties.order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  return a.properties.title.localeCompare(b.properties.title);
}

/**
 * Normalize a plugin-declared page path into a react-router route path.
 * Plugin paths are relative to the mount, so leading/trailing slashes are
 * stripped; an empty path (the plugin's index page) becomes the mount root.
 */
export function normalizePagePath(path: string): string {
  return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Normalize the incoming splat into an absolute pathname for matching. */
function normalizeSplat(splat: string): string {
  const trimmed = splat.replace(/^\/+/, '').replace(/\/+$/, '');
  return `/${trimmed}`;
}

/**
 * Match a splat path (the `*` segment under the mount) against a plugin's page
 * extensions. Returns the most-specific matching page plus its extracted
 * params, or `null` when nothing matches (the mount then renders in-app 404).
 *
 * Ranking, param extraction, and `:param` / nested-segment semantics are all
 * react-router's — we build a flat route list keyed by index and let
 * `matchRoutes` pick the winner, then map the winning route id back to the
 * originating extension.
 */
export function matchPluginPage(pages: PageProjectExtension[], splat: string): PageMatch | null {
  if (pages.length === 0) return null;

  const routes: RouteObject[] = pages.map((page, index) => ({
    id: String(index),
    path: normalizePagePath(page.properties.path),
  }));

  const matches = matchRoutes(routes, normalizeSplat(splat));
  if (!matches || matches.length === 0) return null;

  // Flat routes yield a single match; take the deepest to be safe.
  const winner = matches[matches.length - 1];
  const index = Number(winner.route.id);
  const page = pages[index];
  if (!page) return null;

  return { page, params: winner.params };
}
