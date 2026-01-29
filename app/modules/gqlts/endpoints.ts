import type { GqlScope } from './types';

/**
 * Parses scope type and ID from URL params into a GqlScope object.
 */
export function parseScope(scopeType: string, scopeId: string): GqlScope {
  switch (scopeType) {
    case 'user':
      return { type: 'user', userId: scopeId };
    case 'org':
      return { type: 'org', orgId: scopeId };
    case 'project':
      return { type: 'project', projectId: scopeId };
    default:
      throw new Error(`Unknown scope type: ${scopeType}`);
  }
}

/**
 * Builds the full scoped endpoint URL for the GraphQL gateway.
 */
export function buildScopedEndpoint(baseUrl: string, scope: GqlScope): string {
  console.log('buildScopedEndpoint', `${baseUrl}${buildScopedPath(scope)}`);
  return `${baseUrl}${buildScopedPath(scope)}`;
}

/**
 * Builds the scoped path for direct GraphQL API access (server-side).
 * These paths are appended to GRAPHQL_URL.
 */
export function buildScopedPath(scope: GqlScope): string {
  switch (scope.type) {
    case 'user':
      return `/iam.miloapis.com/v1alpha1/users/${scope.userId}/graphql`;
    case 'org':
      return `/resourcemanager.miloapis.com/v1alpha1/organizations/${scope.orgId}/graphql`;
    case 'project':
      return `/resourcemanager.miloapis.com/v1alpha1/projects/${scope.projectId}/graphql`;
    case 'global':
      return `/graphql`;
  }
}

/**
 * Builds the proxy path for client-side requests.
 * The proxy handles authentication via session cookies.
 */
export function buildProxyPath(scope: GqlScope): string {
  switch (scope.type) {
    case 'user':
      return `/api/graphql/user/${scope.userId}`;
    case 'org':
      return `/api/graphql/org/${scope.orgId}`;
    case 'project':
      return `/api/graphql/project/${scope.projectId}`;
    case 'global':
      return `/api/graphql`;
  }
}
