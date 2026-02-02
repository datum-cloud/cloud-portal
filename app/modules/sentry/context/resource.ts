/**
 * Sentry Resource Context
 *
 * Sets Kubernetes resource context in Sentry for resource-level filtering.
 * Called automatically from axios interceptors when K8s resources are returned.
 */
import * as Sentry from '@sentry/react-router';

export interface KubernetesResource {
  kind: string;
  apiVersion: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
  };
}

/**
 * Parse apiVersion to extract apiGroup and version.
 *
 * @example
 * parseApiVersion("networking.datumapis.com/v1alpha")
 * // → { apiGroup: "networking.datumapis.com", version: "v1alpha" }
 *
 * @example
 * parseApiVersion("v1")
 * // → { apiGroup: "core", version: "v1" }
 */
export function parseApiVersion(apiVersion: string): { apiGroup: string; version: string } {
  if (apiVersion.includes('/')) {
    const [apiGroup, version] = apiVersion.split('/');
    return { apiGroup, version };
  }
  return { apiGroup: 'core', version: apiVersion };
}

/**
 * Check if data is a Kubernetes-style resource.
 */
export function isKubernetesResource(data: unknown): data is KubernetesResource {
  return (
    data !== null &&
    typeof data === 'object' &&
    'kind' in data &&
    'apiVersion' in data &&
    'metadata' in data &&
    typeof (data as KubernetesResource).kind === 'string' &&
    typeof (data as KubernetesResource).apiVersion === 'string' &&
    typeof (data as KubernetesResource).metadata?.name === 'string'
  );
}

/**
 * Set resource context in Sentry.
 */
export function setSentryResourceContext(resource: KubernetesResource): void {
  const { apiGroup, version } = parseApiVersion(resource.apiVersion);

  // Tags for filtering
  Sentry.setTag('resource.kind', resource.kind);
  Sentry.setTag('resource.apiGroup', apiGroup);
  Sentry.setTag('resource.name', resource.metadata.name);
  if (resource.metadata.namespace) {
    Sentry.setTag('resource.namespace', resource.metadata.namespace);
  }

  // Context for detailed view
  Sentry.setContext('resource', {
    kind: resource.kind,
    apiGroup,
    apiVersion: version,
    name: resource.metadata.name,
    namespace: resource.metadata.namespace,
    uid: resource.metadata.uid,
  });
}

/**
 * Clear resource context from Sentry.
 */
export function clearSentryResourceContext(): void {
  Sentry.setTag('resource.kind', undefined);
  Sentry.setTag('resource.apiGroup', undefined);
  Sentry.setTag('resource.name', undefined);
  Sentry.setTag('resource.namespace', undefined);
  Sentry.setContext('resource', null);
}
