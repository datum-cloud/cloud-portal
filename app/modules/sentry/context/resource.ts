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
 * Excludes Status objects which are error responses, not actual resources.
 */
export function isKubernetesResource(data: unknown): data is KubernetesResource {
  if (
    data === null ||
    typeof data !== 'object' ||
    !('kind' in data) ||
    !('apiVersion' in data) ||
    !('metadata' in data)
  ) {
    return false;
  }

  const obj = data as KubernetesResource;

  // Exclude Status objects (error responses)
  if (obj.kind === 'Status') {
    return false;
  }

  return (
    typeof obj.kind === 'string' &&
    typeof obj.apiVersion === 'string' &&
    typeof obj.metadata?.name === 'string'
  );
}

/**
 * Resource info parsed from URL.
 */
export interface UrlResourceInfo {
  apiGroup: string;
  version: string;
  resourceType: string;
  name?: string;
  namespace?: string;
}

/**
 * Parse resource info from API URL path.
 *
 * Supports both direct API paths and project-scoped control-plane paths:
 *
 * @example Direct API path
 * parseResourceFromUrl("/apis/iam.miloapis.com/v1alpha1/users/user123/useridentities")
 * // → { apiGroup: "iam.miloapis.com", version: "v1alpha1", resourceType: "useridentities" }
 *
 * @example Namespaced resource
 * parseResourceFromUrl("/apis/networking.datumapis.com/v1alpha/namespaces/ns1/httpproxies/proxy1")
 * // → { apiGroup: "networking.datumapis.com", version: "v1alpha", resourceType: "httpproxies", namespace: "ns1", name: "proxy1" }
 *
 * @example Project-scoped control-plane path
 * parseResourceFromUrl("/apis/resourcemanager.miloapis.com/v1alpha1/projects/my-project/control-plane/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnszones/my-zone")
 * // → { apiGroup: "dns.networking.miloapis.com", version: "v1alpha1", resourceType: "dnszones", namespace: "default", name: "my-zone" }
 */
export function parseResourceFromUrl(url: string): UrlResourceInfo | null {
  // Remove query params and normalize
  let path = url.split('?')[0].replace(/^\/api\/proxy/, '');

  // Handle project-scoped control-plane paths
  // Pattern: /apis/.../projects/{id}/control-plane/apis/{apiGroup}/{version}/...
  const controlPlaneMatch = path.match(/\/control-plane\/apis\/(.+)/);
  if (controlPlaneMatch) {
    // Extract the nested API path after control-plane
    path = '/apis/' + controlPlaneMatch[1];
  }

  // Match /apis/{apiGroup}/{version}/...
  const apisMatch = path.match(/^\/apis\/([^/]+)\/([^/]+)\/(.+)/);
  if (apisMatch) {
    const [, apiGroup, version, rest] = apisMatch;
    return parseResourcePath(apiGroup, version, rest);
  }

  // Match /api/{version}/... (core API)
  const coreMatch = path.match(/^\/api\/([^/]+)\/(.+)/);
  if (coreMatch) {
    const [, version, rest] = coreMatch;
    return parseResourcePath('core', version, rest);
  }

  return null;
}

/**
 * Parse the resource path after apiGroup/version.
 */
function parseResourcePath(apiGroup: string, version: string, rest: string): UrlResourceInfo {
  const parts = rest.split('/').filter(Boolean);

  // Pattern: namespaces/{ns}/{resourceType}/{name}
  if (parts[0] === 'namespaces' && parts.length >= 3) {
    return {
      apiGroup,
      version,
      namespace: parts[1],
      resourceType: parts[2],
      name: parts[3],
    };
  }

  // Pattern: {resourceType}/{name}/... or {resourceType}
  return {
    apiGroup,
    version,
    resourceType: parts[0],
    name: parts[1],
  };
}

/**
 * Set resource context from URL (used for error responses).
 */
export function setResourceContextFromUrl(url: string): void {
  const info = parseResourceFromUrl(url);
  if (!info) return;

  // Tags for filtering
  Sentry.setTag('resource.apiGroup', info.apiGroup);
  Sentry.setTag('resource.version', info.version);
  Sentry.setTag('resource.type', info.resourceType);
  if (info.name) {
    Sentry.setTag('resource.name', info.name);
  }
  if (info.namespace) {
    Sentry.setTag('resource.namespace', info.namespace);
  }

  // Context for detailed view
  Sentry.setContext('resource', {
    apiGroup: info.apiGroup,
    apiVersion: info.version,
    resourceType: info.resourceType,
    name: info.name,
    namespace: info.namespace,
    // source: 'url', // Indicates this was parsed from URL, not response
  });
}

/**
 * Set resource context in Sentry.
 */
export function setSentryResourceContext(resource: KubernetesResource): void {
  const { apiGroup, version } = parseApiVersion(resource.apiVersion);

  // Tags for filtering
  Sentry.setTag('resource.kind', resource.kind);
  Sentry.setTag('resource.apiGroup', apiGroup);
  Sentry.setTag('resource.version', version);
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
  Sentry.setTag('resource.version', undefined);
  Sentry.setTag('resource.type', undefined);
  Sentry.setTag('resource.name', undefined);
  Sentry.setTag('resource.namespace', undefined);
  Sentry.setContext('resource', null);
}
