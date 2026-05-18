import type { ApiClientConfig } from '@datum-cloud/activity-ui';

/**
 * Create an Activity API client configured for cloud-portal.
 *
 * Uses /api/proxy as the base URL. Cloud-portal's Hono proxy is a raw
 * passthrough that injects Bearer auth from the session cookie and returns
 * the upstream response as-is (no response envelope, no transformer needed).
 *
 * Return type is annotated as `ApiClientConfig` from activity-ui so any
 * future required fields surface here at the factory rather than at every
 * `new ActivityApiClient(...)` call site.
 *
 * @param controlPlanePath - Path to the tenant's control plane.
 *   Examples:
 *   - /apis/resourcemanager.miloapis.com/v1alpha1/projects/{name}/control-plane
 *   - /apis/resourcemanager.miloapis.com/v1alpha1/organizations/{name}/control-plane
 *   - /apis/iam.miloapis.com/v1alpha1/users/{userId}/control-plane
 */
export function createActivityClientConfig(controlPlanePath?: string): ApiClientConfig {
  const baseUrl = controlPlanePath ? `/api/proxy${controlPlanePath}` : '/api/proxy';

  return { baseUrl };
  // No token — proxy handles auth via session cookies.
  // No responseTransformer — proxy returns raw API responses.
}

/**
 * Build the control plane path for a project.
 */
export function getProjectControlPlanePath(projectName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${encodeURIComponent(projectName)}/control-plane`;
}

/**
 * Build the control plane path for an organization.
 */
export function getOrganizationControlPlanePath(organizationName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${encodeURIComponent(organizationName)}/control-plane`;
}

/**
 * Build the control plane path for a user (identity-scoped).
 *
 * Uses the iam.miloapis.com API group rather than resourcemanager.
 * Pattern matches the watch hub at app/server/watch/watch-hub.ts:466.
 *
 * On the upstream Activity API server, user-scope is a first-class concept
 * that filters by `user_uid` regardless of which org/project the activity
 * happened in. See docs/architecture/multi-tenancy.md in datum-cloud/activity.
 */
export function getUserControlPlanePath(userId: string): string {
  return `/apis/iam.miloapis.com/v1alpha1/users/${encodeURIComponent(userId)}/control-plane`;
}
