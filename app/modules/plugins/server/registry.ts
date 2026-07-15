/**
 * In-memory plugin registry.
 *
 * Holds resolved {@link PluginRegistryEntry} records keyed by slug, partitioned
 * by source so precedence and removal are unambiguous. Sources push specs in;
 * the registry runs the manifest pipeline and exposes a servable, merged view
 * to loaders and routes.
 *
 * Precedence on slug collision: `static` > `kubeconfig` > `platform` — a locally
 * overridden plugin wins over the same slug discovered from a cluster.
 */
import type { PluginRegistryEntry, PluginRegistrySource, PortalPluginSpec } from '../types';
import { isReady, resolveManifest, type ResolveManifestOptions } from './manifest-pipeline';

/** Highest precedence first. */
const SOURCE_PRECEDENCE: PluginRegistrySource[] = ['static', 'kubeconfig', 'platform'];

export interface PluginRegistryOptions {
  /** Injectable for tests; forwarded to the manifest pipeline. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export class PluginRegistry {
  private readonly bySource = new Map<PluginRegistrySource, Map<string, PluginRegistryEntry>>();
  private readonly resolveOptions: ResolveManifestOptions;

  constructor(options: PluginRegistryOptions = {}) {
    this.resolveOptions = { fetchImpl: options.fetchImpl, now: options.now };
    for (const source of SOURCE_PRECEDENCE) {
      this.bySource.set(source, new Map());
    }
  }

  /**
   * Adds or updates a plugin from a source. Runs the manifest pipeline and
   * stores the resolved entry. Resolves once the entry is committed so callers
   * (and tests) can await a stable registry state.
   */
  async upsert(
    source: PluginRegistrySource,
    spec: PortalPluginSpec,
    devMode: boolean
  ): Promise<PluginRegistryEntry> {
    const resolution = await resolveManifest(spec, this.resolveOptions);
    const entry: PluginRegistryEntry = {
      spec,
      devMode,
      source,
      manifest: resolution.manifest,
      manifestDigest: resolution.manifestDigest,
      status: resolution.status,
    };
    this.sourceMap(source).set(spec.slug, entry);
    return entry;
  }

  /** Removes a plugin (e.g. on a watch DELETED event or a static override drop). */
  remove(source: PluginRegistrySource, slug: string): void {
    this.sourceMap(source).delete(slug);
  }

  /** Drops every entry from a source (e.g. reseeding on a watch relist). */
  clearSource(source: PluginRegistrySource): void {
    this.sourceMap(source).clear();
  }

  /** All entries for one source, including non-servable ones (for status writes). */
  entriesForSource(source: PluginRegistrySource): PluginRegistryEntry[] {
    return [...this.sourceMap(source).values()];
  }

  /**
   * The merged view across all sources with precedence applied. Includes
   * non-servable entries; callers that serve plugins should use
   * {@link getPlugins} / {@link getPlugin} instead.
   */
  allEntries(): PluginRegistryEntry[] {
    const merged = new Map<string, PluginRegistryEntry>();
    // Walk lowest precedence first so higher-precedence sources overwrite.
    for (const source of [...SOURCE_PRECEDENCE].reverse()) {
      for (const entry of this.sourceMap(source).values()) {
        merged.set(entry.spec.slug, entry);
      }
    }
    return [...merged.values()];
  }

  /** Servable plugins (Ready and not suspended), precedence-merged. */
  getPlugins(): PluginRegistryEntry[] {
    return this.allEntries().filter((entry) => isReady(entry.status));
  }

  /** A single servable plugin by slug, or undefined if unknown/not servable. */
  getPlugin(slug: string): PluginRegistryEntry | undefined {
    const entry = this.resolveMerged(slug);
    return entry && isReady(entry.status) ? entry : undefined;
  }

  private resolveMerged(slug: string): PluginRegistryEntry | undefined {
    for (const source of SOURCE_PRECEDENCE) {
      const entry = this.sourceMap(source).get(slug);
      if (entry) return entry;
    }
    return undefined;
  }

  private sourceMap(source: PluginRegistrySource): Map<string, PluginRegistryEntry> {
    const map = this.bySource.get(source);
    if (!map) throw new Error(`unknown plugin registry source: ${source}`);
    return map;
  }
}
