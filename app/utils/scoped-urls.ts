/**
 * Utility for constructing scoped base URLs that work on both server and client.
 *
 * The control-plane API uses scoped endpoints:
 * - User-scoped: /apis/iam.miloapis.com/v1alpha1/users/{userId}/control-plane/...
 * - Org-scoped: /apis/resourcemanager.miloapis.com/v1alpha1/organizations/{orgId}/control-plane/...
 * - Project-scoped: /apis/resourcemanager.miloapis.com/v1alpha1/projects/{projectId}/control-plane/...
 *
 * When passing `baseURL` to SDK functions, it overrides the axios instance baseURL.
 * We get the base URL from the configured client's axios instance:
 * - Server: https://api.staging.env.datum.net (direct API access)
 * - Client: /api/proxy (proxied through Hono server)
 */
import { client } from '@/modules/control-plane/shared/client.gen';

/**
 * Constructs the appropriate base URL for the current environment.
 * Gets the base URL from the configured axios instance.
 */
function getScopedBaseUrl(scopePath: string): string {
  const axios = client.getConfig().axios;
  const baseUrl = axios?.defaults?.baseURL || '';
  return `${baseUrl}${scopePath}`;
}

/**
 * Get user-scoped base URL for endpoints that require user context.
 * Uses /users/me/ which gets replaced by axios interceptor with actual userId.
 */
export function getUserScopedBase(userId: string = 'me'): string {
  return getScopedBaseUrl(`/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`);
}

/**
 * Get organization-scoped base URL for endpoints that require org context.
 */
export function getOrgScopedBase(orgId: string): string {
  return getScopedBaseUrl(
    `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${orgId}/control-plane`
  );
}

/**
 * Get project-scoped base URL for endpoints that require project context.
 */
export function getProjectScopedBase(projectId: string): string {
  return getScopedBaseUrl(
    `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectId}/control-plane`
  );
}
