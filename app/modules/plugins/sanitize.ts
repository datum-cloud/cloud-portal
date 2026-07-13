/**
 * Projection from a server-held {@link PluginRegistryEntry} to the browser-safe
 * {@link PublicPlugin} wire shape.
 *
 * Pure and dependency-free (types only), so both the HTTP list route and a
 * server loader that resolves a single plugin via `getPlugin(slug)` can produce
 * the identical sanitized shape from one definition — no drift.
 *
 * Deliberately omits `assets.caBundle`, `assets.baseURL`, and proxy backend
 * URLs: plugin origins are never exposed to the browser. The client loads
 * assets and proxies calls exclusively through `/api/plugins/<slug>/…`.
 */
import type { PluginRegistryEntry, PublicPlugin } from './types';

/**
 * Returns the sanitized wire shape for an entry, or `null` when the entry has
 * no resolved manifest (i.e. not servable) and therefore nothing to serve.
 */
export function toPublicPlugin(entry: PluginRegistryEntry): PublicPlugin | null {
  if (!entry.manifest) return null;
  return {
    slug: entry.spec.slug,
    displayName: entry.spec.displayName,
    devMode: entry.devMode,
    deprecated: entry.spec.deprecated,
    source: entry.source,
    proxyAliases: entry.spec.proxy.map((p) => p.alias),
    manifest: {
      name: entry.manifest.name,
      version: entry.manifest.version,
      remoteEntry: entry.manifest.remoteEntry,
      exposedModules: entry.manifest.exposedModules,
      extensions: entry.manifest.extensions,
    },
  };
}
