/**
 * Server-side plugin registry singleton + wiring.
 *
 * The registry is instantiated once with the server and populated by
 * development-only sources (static today; kubeconfig in a follow-up PR).
 * Loaders and routes read it through {@link getPlugins} / {@link getPlugin}.
 * The `platform` source (production watch of the control plane) is
 * intentionally out of scope for v1; its precedence slot exists in
 * {@link PluginRegistry}.
 */
import type { PluginRegistryEntry } from '../types';
import { planDevSources } from './dev-sources';
import { PluginRegistry } from './registry';
import { StaticSource } from './static-source';
import { env } from '@/utils/env/env.server';

// Re-export the sanitizer on the server accessor surface (alongside
// getPlugin/getPlugins) so a server loader can project a getPlugin(slug) result
// into the browser-safe PublicPlugin from one shared definition — no drift.
export { toPublicPlugin } from '../sanitize';

/** The process-wide plugin registry. */
export const pluginRegistry = new PluginRegistry();

/** Servable plugins (Ready, precedence-merged). For loaders and the API list. */
export function getPlugins(): PluginRegistryEntry[] {
  return pluginRegistry.getPlugins();
}

/** A single servable plugin by slug, or undefined if unknown/not servable. */
export function getPlugin(slug: string): PluginRegistryEntry | undefined {
  return pluginRegistry.getPlugin(slug);
}

let initialized = false;

/**
 * Wires the registry sources. Idempotent. The static + kubeconfig sources are
 * hard-disabled outside development — they are plugin-loading vectors and must
 * never populate the registry in production (enhancement §Security).
 */
export function initPluginRegistry(): void {
  if (initialized) return;
  initialized = true;

  const staticEnv = env.server.portalPlugins;
  const staticJsonEnv = env.server.portalPluginsJson;

  const plan = planDevSources({
    isDev: env.isDev,
    portalPlugins: staticEnv,
    portalPluginsJson: staticJsonEnv,
  });

  if (plan.disabledInProd) {
    console.warn(
      '[plugins] PORTAL_PLUGINS / PORTAL_PLUGINS_JSON are dev-only ' +
        'registry sources and are ignored outside NODE_ENV=development'
    );
    return;
  }

  if (plan.static) {
    void new StaticSource(pluginRegistry, { raw: staticEnv, rawJson: staticJsonEnv }).start();
  }
}
