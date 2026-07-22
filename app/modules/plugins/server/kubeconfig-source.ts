/**
 * Kubeconfig registry source (dev only, Tier 1).
 *
 * Lists and watches cluster-scoped `PortalPlugin` resources on a local cluster
 * (kwok) via fetch streaming, reducing ADDED/MODIFIED/DELETED events into the
 * registry, and best-effort PATCHing each resource's status subresource with
 * Discovered / Compatible / Ready conditions. This exercises the same
 * registration + discovery machinery as production.
 */
import {
  DEFAULT_MANIFEST_PATH,
  PORTAL_PLUGIN_GROUP,
  PORTAL_PLUGIN_PLURAL,
  PORTAL_PLUGIN_VERSION,
  type PluginEntryStatus,
  type PortalPluginSpec,
} from '../types';
import type { KubeClient } from './kubeconfig';
import type { PluginRegistry } from './registry';

interface PortalPluginConditionResource {
  type?: string;
  status?: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

interface CaBundleRef {
  kind: 'Secret' | 'ConfigMap';
  name: string;
  namespace: string;
  key: string;
}

function parseCaBundleRef(value: unknown): CaBundleRef | null {
  if (!value || typeof value !== 'object') return null;
  const ref = value as Record<string, unknown>;
  if (ref.kind !== 'Secret' && ref.kind !== 'ConfigMap') return null;
  if (typeof ref.name !== 'string' || !ref.name) return null;
  if (typeof ref.namespace !== 'string' || !ref.namespace) return null;
  if (typeof ref.key !== 'string' || !ref.key) return null;
  return { kind: ref.kind, name: ref.name, namespace: ref.namespace, key: ref.key };
}

/**
 * Resolves a `caBundleRef` into the PEM bundle it points at. Secret `data` is
 * base64-encoded (the k8s API convention); ConfigMap `data` is plain text.
 * Throws on any failure (404, missing key) — a broken ref is a real
 * misconfiguration, not something to silently degrade past.
 */
async function resolveCaBundleRef(client: KubeClient, ref: CaBundleRef): Promise<string> {
  const resourcePath = ref.kind === 'Secret' ? 'secrets' : 'configmaps';
  const response = await client.request(
    `/api/v1/namespaces/${ref.namespace}/${resourcePath}/${ref.name}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!response.ok) {
    throw new Error(`fetch ${ref.kind} "${ref.namespace}/${ref.name}" failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { data?: Record<string, string> };
  const value = body.data?.[ref.key];
  if (!value) {
    throw new Error(`${ref.kind} "${ref.namespace}/${ref.name}" has no data key "${ref.key}"`);
  }
  return ref.kind === 'Secret' ? Buffer.from(value, 'base64').toString('utf8') : value;
}

/** A cluster-scoped PortalPlugin resource as returned by the API server. */
interface PortalPluginResource {
  apiVersion?: string;
  kind?: string;
  metadata?: { name?: string; generation?: number; resourceVersion?: string };
  spec?: Record<string, any>;
  status?: { conditions?: PortalPluginConditionResource[] };
}

interface WatchEvent {
  type: 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR';
  object: PortalPluginResource & { code?: number; message?: string };
}

const RESOURCE_PATH = `/apis/${PORTAL_PLUGIN_GROUP}/${PORTAL_PLUGIN_VERSION}/${PORTAL_PLUGIN_PLURAL}`;

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export interface KubeconfigSourceOptions {
  /** Best-effort status writes; disable if the client lacks status permission. */
  patchStatus?: boolean;
  logger?: Pick<Console, 'warn' | 'info' | 'error'>;
  /** Injectable delay for tests. */
  delay?: (ms: number) => Promise<void>;
}

/**
 * Normalizes a PortalPlugin resource's spec into the internal spec shape.
 * `client` is used to resolve `assets.caBundleRef`, if set. Returns null for a
 * malformed resource — missing slug/baseURL, an unparseable caBundleRef, or a
 * caBundleRef that fails to resolve are all treated the same way: skip this
 * resource and log, rather than serve a plugin with a broken TLS config.
 */
export async function specFromResource(
  resource: PortalPluginResource,
  client: KubeClient,
  logger: Pick<Console, 'warn'> = console
): Promise<PortalPluginSpec | null> {
  const s = resource.spec ?? {};
  const slug = typeof s.slug === 'string' ? s.slug : undefined;
  if (!slug) return null;
  if (!s.assets?.baseURL) return null;

  let caBundle: string | undefined;
  if (s.assets.caBundleRef !== undefined) {
    const ref = parseCaBundleRef(s.assets.caBundleRef);
    if (!ref) {
      logger.warn(`[plugins] PortalPlugin "${slug}" has a malformed assets.caBundleRef`);
      return null;
    }
    try {
      caBundle = await resolveCaBundleRef(client, ref);
    } catch (err) {
      logger.warn(`[plugins] PortalPlugin "${slug}" caBundleRef could not be resolved: ${String(err)}`);
      return null;
    }
  }

  return {
    slug,
    displayName: typeof s.displayName === 'string' && s.displayName ? s.displayName : slug,
    deprecated: s.deprecated === true,
    suspend: s.suspend === true,
    assets: {
      baseURL: s.assets.baseURL,
      manifestPath: s.assets.manifestPath || DEFAULT_MANIFEST_PATH,
      caBundle,
    },
    visibility: {
      entitlement: s.visibility?.entitlement === 'None' ? 'None' : 'Required',
      featureFlag: s.visibility?.featureFlag || undefined,
    },
    contentSecurityPolicy: Array.isArray(s.contentSecurityPolicy)
      ? s.contentSecurityPolicy
      : undefined,
  };
}

/**
 * Whether the desired conditions already match the resource's current ones,
 * comparing type/status/reason/message but IGNORING `lastTransitionTime` — so a
 * status write is only issued when something meaningful actually changed.
 */
function conditionsMatch(
  desired: PluginEntryStatus['conditions'],
  current: PortalPluginConditionResource[] | undefined
): boolean {
  if (!current || current.length !== desired.length) return false;
  return desired.every((d) => {
    const c = current.find((e) => e.type === d.type);
    return (
      c !== undefined &&
      c.status === d.status &&
      (c.reason ?? '') === (d.reason ?? '') &&
      (c.message ?? '') === (d.message ?? '')
    );
  });
}

export class KubeconfigSource {
  private readonly registry: PluginRegistry;
  private readonly client: KubeClient;
  private readonly patchStatusEnabled: boolean;
  private readonly logger: Pick<Console, 'warn' | 'info' | 'error'>;
  private readonly delay: (ms: number) => Promise<void>;

  private readonly abort = new AbortController();
  private resourceVersion: string | undefined;
  /** Resource name → slug, so DELETED and status patches resolve correctly. */
  private readonly nameToSlug = new Map<string, string>();
  /**
   * Resource name → a stable key of the last reconciled (normalized) spec. Watch
   * MODIFIED events that carry only our own status patch back have an unchanged
   * spec, so they're ignored here — preventing an endless reconcile →
   * status-patch → MODIFIED → reconcile feedback loop. Keying on spec CONTENT
   * (rather than `metadata.generation`) means a real spec change always applies,
   * without depending on the apiserver's generation-bump semantics.
   */
  private readonly lastSpecKey = new Map<string, string>();
  private stopped = false;

  constructor(registry: PluginRegistry, client: KubeClient, options: KubeconfigSourceOptions = {}) {
    this.registry = registry;
    this.client = client;
    this.patchStatusEnabled = options.patchStatus ?? true;
    this.logger = options.logger ?? console;
    this.delay = options.delay ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Starts the list+watch loop in the background (does not block boot). */
  start(): void {
    void this.listAndWatchLoop();
  }

  stop(): void {
    this.stopped = true;
    this.abort.abort();
  }

  private async listAndWatchLoop(): Promise<void> {
    let backoff = INITIAL_BACKOFF_MS;
    while (!this.stopped) {
      try {
        await this.list();
        backoff = INITIAL_BACKOFF_MS; // a clean list resets backoff
        await this.watch();
      } catch (err) {
        if (this.stopped) return;
        this.logger.warn(
          `[plugins] kubeconfig watch error, retrying in ${backoff}ms: ${String(err)}`
        );
        await this.delay(backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      }
    }
  }

  /** Seeds the registry from a full list and prunes entries that disappeared. */
  private async list(): Promise<void> {
    const response = await this.client.request(RESOURCE_PATH, {
      headers: { Accept: 'application/json' },
      signal: this.abort.signal,
    });
    if (!response.ok) {
      throw new Error(`list PortalPlugins failed: HTTP ${response.status}`);
    }

    const body = (await response.json()) as {
      items?: PortalPluginResource[];
      metadata?: { resourceVersion?: string };
    };
    this.resourceVersion = body.metadata?.resourceVersion;

    const seenSlugs = new Set<string>();
    for (const item of body.items ?? []) {
      // Force a full reconcile on (re)list so a resync always refreshes.
      const slug = await this.reconcile(item, true);
      if (slug) seenSlugs.add(slug);
    }

    // Prune slugs that are no longer present in the cluster.
    for (const [name, slug] of [...this.nameToSlug]) {
      if (!seenSlugs.has(slug)) {
        this.registry.remove('kubeconfig', slug);
        this.nameToSlug.delete(name);
        this.lastSpecKey.delete(name);
      }
    }

    this.logger.info(`[plugins] kubeconfig source listed ${seenSlugs.size} PortalPlugin(s)`);
  }

  /** Streams watch events from the current resourceVersion until the stream ends. */
  private async watch(): Promise<void> {
    const query = new URLSearchParams({ watch: 'true', allowWatchBookmarks: 'true' });
    if (this.resourceVersion) query.set('resourceVersion', this.resourceVersion);

    const response = await this.client.request(`${RESOURCE_PATH}?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: this.abort.signal,
    });
    if (!response.ok) {
      // 410 Gone: our resourceVersion is too old — drop it and re-list.
      if (response.status === 410) this.resourceVersion = undefined;
      throw new Error(`watch PortalPlugins failed: HTTP ${response.status}`);
    }
    if (!response.body) throw new Error('watch PortalPlugins returned no body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (!this.stopped) {
      const { done, value } = await reader.read();
      if (done) return; // stream closed; caller re-lists + re-watches
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line === '') continue;

        let event: WatchEvent;
        try {
          event = JSON.parse(line) as WatchEvent;
        } catch {
          this.logger.warn('[plugins] skipping unparseable watch line');
          continue;
        }
        await this.applyWatchEvent(event);
      }
    }
  }

  /**
   * Reduces a single watch event into the registry. Exposed for unit testing
   * the watch-event → registry-map mapping.
   */
  async applyWatchEvent(event: WatchEvent): Promise<void> {
    const rv = event.object?.metadata?.resourceVersion;
    if (rv) this.resourceVersion = rv;

    switch (event.type) {
      case 'ADDED':
      case 'MODIFIED':
        await this.reconcile(event.object);
        return;
      case 'DELETED': {
        const name = event.object?.metadata?.name;
        const slug = event.object?.spec?.slug ?? (name ? this.nameToSlug.get(name) : undefined);
        if (slug) this.registry.remove('kubeconfig', slug);
        if (name) {
          this.nameToSlug.delete(name);
          this.lastSpecKey.delete(name);
        }
        return;
      }
      case 'BOOKMARK':
        return; // resourceVersion already advanced above
      case 'ERROR':
        // A 410 Gone status arrives as an ERROR event; force a re-list.
        if (event.object?.code === 410) this.resourceVersion = undefined;
        throw new Error(`watch ERROR event: ${event.object?.message ?? 'unknown'}`);
    }
  }

  /**
   * Upserts one resource and writes its resolved status back. Returns the slug.
   *
   * Reconciles only when the normalized spec has actually changed since we last
   * processed it — status-only MODIFIED events (including the ones our own status
   * patch produces, which leave the spec untouched) are no-ops, which is what
   * breaks the feedback loop. `force` bypasses the gate for a full re-list resync.
   */
  private async reconcile(
    resource: PortalPluginResource,
    force = false
  ): Promise<string | undefined> {
    const spec = await specFromResource(resource, this.client, this.logger);
    const name = resource.metadata?.name;
    if (!spec) {
      this.logger.warn(
        `[plugins] skipping PortalPlugin "${name ?? '<unnamed>'}": missing slug or assets.baseURL`
      );
      return undefined;
    }

    if (name) this.nameToSlug.set(name, spec.slug);

    // Skip when the spec is byte-identical to the last one we applied.
    const specKey = JSON.stringify(spec);
    if (!force && name !== undefined && this.lastSpecKey.get(name) === specKey) {
      return spec.slug;
    }

    const entry = await this.registry.upsert('kubeconfig', spec, false);
    if (name !== undefined) this.lastSpecKey.set(name, specKey);

    if (this.patchStatusEnabled && name) {
      await this.patchStatus(
        name,
        resource.metadata?.generation,
        entry.status,
        resource.status?.conditions
      );
    }
    return spec.slug;
  }

  /**
   * Best-effort status patch. Registry health never depends on this succeeding.
   *
   * Idempotent: skips the write entirely when the desired conditions already
   * match what's on the resource (comparing everything except timestamps), and
   * preserves each condition's `lastTransitionTime` when its status didn't
   * change. Without this, a fresh `lastTransitionTime` on every write would make
   * each patch a real mutation and re-trigger the watch.
   */
  private async patchStatus(
    name: string,
    generation: number | undefined,
    status: PluginEntryStatus,
    current: PortalPluginConditionResource[] | undefined
  ): Promise<void> {
    if (conditionsMatch(status.conditions, current)) {
      return; // nothing changed — don't churn the resourceVersion
    }

    const now = new Date().toISOString();
    const body = {
      status: {
        observedGeneration: generation,
        conditions: status.conditions.map((c) => {
          const existing = current?.find((e) => e.type === c.type);
          // lastTransitionTime only advances when the condition's status flips.
          const lastTransitionTime =
            existing && existing.status === c.status ? (existing.lastTransitionTime ?? now) : now;
          return {
            type: c.type,
            status: c.status,
            reason: c.reason,
            message: c.message ?? '',
            lastTransitionTime,
            ...(generation !== undefined ? { observedGeneration: generation } : {}),
          };
        }),
        ...(status.manifest ? { manifest: status.manifest } : {}),
      },
    };

    try {
      const response = await this.client.request(`${RESOURCE_PATH}/${name}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify(body),
        signal: this.abort.signal,
      });
      if (!response.ok) {
        this.logger.warn(`[plugins] status patch for "${name}" rejected: HTTP ${response.status}`);
      }
    } catch (err) {
      if (this.stopped) return;
      this.logger.warn(`[plugins] status patch for "${name}" failed: ${String(err)}`);
    }
  }
}
