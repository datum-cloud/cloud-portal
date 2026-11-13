/**
 * Kubeconfig registry source (dev only, Tier 1).
 *
 * Lists and watches cluster-scoped `PortalPlugin` resources on a local cluster
 * (kwok), exercising the same registration + discovery machinery as
 * production. The list/watch, backoff, reconcile and status-patch loop is
 * `CrdPluginSource`, shared with `PlatformSource`; this file holds only what
 * is specific to the dev source: the CRD it targets, the `kubeconfig` registry
 * source, and spec normalization, which resolves `assets.caBundleRef` against
 * the cluster and is therefore async.
 */
import {
  DEFAULT_MANIFEST_PATH,
  PORTAL_PLUGIN_GROUP,
  PORTAL_PLUGIN_PLURAL,
  PORTAL_PLUGIN_VERSION,
  type PortalPluginSpec,
} from '../types';
import {
  CrdPluginSource,
  type CrdPluginSourceOptions,
  type PluginCrdResource,
} from './crd-plugin-source';
import type { KubeClient } from './kubeconfig';
import type { PluginRegistry } from './registry';

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
    throw new Error(
      `fetch ${ref.kind} "${ref.namespace}/${ref.name}" failed: HTTP ${response.status}`
    );
  }
  const body = (await response.json()) as { data?: Record<string, string> };
  const value = body.data?.[ref.key];
  if (!value) {
    throw new Error(`${ref.kind} "${ref.namespace}/${ref.name}" has no data key "${ref.key}"`);
  }
  return ref.kind === 'Secret' ? Buffer.from(value, 'base64').toString('utf8') : value;
}

/** A cluster-scoped PortalPlugin resource as returned by the API server. */
type PortalPluginResource = PluginCrdResource;

const RESOURCE_PATH = `/apis/${PORTAL_PLUGIN_GROUP}/${PORTAL_PLUGIN_VERSION}/${PORTAL_PLUGIN_PLURAL}`;

export type KubeconfigSourceOptions = CrdPluginSourceOptions;

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
      logger.warn(
        `[plugins] PortalPlugin "${slug}" caBundleRef could not be resolved: ${String(err)}`
      );
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

export class KubeconfigSource extends CrdPluginSource {
  constructor(registry: PluginRegistry, client: KubeClient, options: KubeconfigSourceOptions = {}) {
    super(
      registry,
      client,
      {
        source: 'kubeconfig',
        kind: 'PortalPlugin',
        resourcePath: RESOURCE_PATH,
        toSpec: (resource, context) => specFromResource(resource, context.client, context.logger),
      },
      options
    );
  }
}
