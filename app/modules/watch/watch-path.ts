import type { WatchOptions } from './watch.types';

export type WatchPathRequest = Pick<
  WatchOptions,
  'resourceType' | 'orgId' | 'projectId' | 'namespace' | 'userScoped'
>;

/**
 * K8s API path for a watch. Omits `/namespaces/...` when `namespace` is unset
 * so cluster-scoped resources (Project, Location) resolve.
 */
export function buildWatchUpstreamPath(req: WatchPathRequest, userId?: string): string {
  if (req.userScoped) {
    // Needs the real userId, not 'me': this fetch() bypasses the axios
    // interceptor that rewrites /users/me/.
    if (!userId) throw new Error('[WatchHub] userId required for userScoped watch');
    return `/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane/${req.resourceType}`;
  }

  if (req.orgId) {
    if (req.namespace) {
      const parts = req.resourceType.split('/');
      const resourceName = parts.pop();
      const apiPath = parts.join('/');
      return `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${req.orgId}/control-plane/${apiPath}/namespaces/${req.namespace}/${resourceName}`;
    }
    return `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${req.orgId}/control-plane/${req.resourceType}`;
  }

  if (req.projectId) {
    // Do not default namespace to `default`: cluster-scoped watches would 404.
    if (req.namespace) {
      const parts = req.resourceType.split('/');
      const resourceName = parts.pop();
      const apiPath = parts.join('/');
      return `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${req.projectId}/control-plane/${apiPath}/namespaces/${req.namespace}/${resourceName}`;
    }
    return `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${req.projectId}/control-plane/${req.resourceType}`;
  }

  if (req.namespace) {
    const parts = req.resourceType.split('/');
    const resourceName = parts.pop();
    const apiPath = parts.join('/');
    return `/${apiPath}/namespaces/${req.namespace}/${resourceName}`;
  }

  return `/${req.resourceType}`;
}
