/**
 * Platform registry source (production).
 *
 * Lists and watches the cluster-scoped `ConsumerPortalPlugin` CRD
 * (portal.miloapis.com/v1alpha1) on milo's control plane via fetch
 * streaming, reducing ADDED/MODIFIED/DELETED events into the registry, and
 * best-effort PATCHing each resource's status subresource with
 * Discovered / Compatible / Ready conditions. The loop itself lives in
 * `CrdPluginSource`, shared with `KubeconfigSource`; the difference is
 * entirely in what credential/endpoint the `KubeClient` it's given points
 * at, and the CRD it targets. One real simplification versus
 * `KubeconfigSource`: `ConsumerPortalPlugin.spec.assets.caBundle` is a flat
 * PEM string, not a `caBundleRef` pointing at a Secret/ConfigMap, so there's
 * no live ref-resolution step here.
 */
import {
  CONSUMER_PORTAL_PLUGIN_GROUP,
  CONSUMER_PORTAL_PLUGIN_PLURAL,
  CONSUMER_PORTAL_PLUGIN_VERSION,
  DEFAULT_MANIFEST_PATH,
  type PortalPluginSpec,
} from '../types';
import {
  CrdPluginSource,
  type CrdPluginSourceOptions,
  type PluginCrdResource,
} from './crd-plugin-source';
import type { KubeClient } from './kubeconfig';
import type { PluginRegistry } from './registry';

const RESOURCE_PATH = `/apis/${CONSUMER_PORTAL_PLUGIN_GROUP}/${CONSUMER_PORTAL_PLUGIN_VERSION}/${CONSUMER_PORTAL_PLUGIN_PLURAL}`;

export type PlatformSourceOptions = CrdPluginSourceOptions;

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * Normalizes a ConsumerPortalPlugin resource's spec into the internal spec
 * shape. Returns null for a malformed resource — missing slug or
 * assets.baseURL — rather than serving a broken entry.
 */
export function specFromConsumerPortalPlugin(
  resource: PluginCrdResource,
  logger: Pick<Console, 'warn'> = console
): PortalPluginSpec | null {
  const s = resource.spec ?? {};
  const slug = typeof s.slug === 'string' ? s.slug : undefined;
  if (!slug) return null;
  if (!s.assets?.baseURL) {
    logger.warn(`[plugins] ConsumerPortalPlugin "${slug}" is missing assets.baseURL`);
    return null;
  }

  return {
    slug,
    displayName: typeof s.displayName === 'string' && s.displayName ? s.displayName : slug,
    deprecated: s.deprecated === true,
    suspend: s.suspend === true,
    serviceName: nonEmptyString(s.serviceName),
    serviceRefName: nonEmptyString(s.serviceRef?.name),
    assets: {
      baseURL: s.assets.baseURL,
      manifestPath: s.assets.manifestPath || DEFAULT_MANIFEST_PATH,
      caBundle: typeof s.assets.caBundle === 'string' ? s.assets.caBundle : undefined,
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

export class PlatformSource extends CrdPluginSource {
  constructor(registry: PluginRegistry, client: KubeClient, options: PlatformSourceOptions = {}) {
    super(
      registry,
      client,
      {
        source: 'platform',
        kind: 'ConsumerPortalPlugin',
        resourcePath: RESOURCE_PATH,
        toSpec: (resource, { logger }) => specFromConsumerPortalPlugin(resource, logger),
      },
      options
    );
  }
}
