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
 * On the upstream Activity API server, user-scope is a first-class concept
 * that filters by `user_uid` regardless of which org/project the activity
 * happened in. See docs/architecture/multi-tenancy.md in datum-cloud/activity.
 *
 * @param controlPlanePath - Path to the tenant's control plane, built with the
 *   `get*ControlPlanePath` helpers in `@/resources/base/utils`.
 */
export function createActivityClientConfig(controlPlanePath?: string): ApiClientConfig {
  const baseUrl = controlPlanePath ? `/api/proxy${controlPlanePath}` : '/api/proxy';

  return { baseUrl };
  // No token — proxy handles auth via session cookies.
  // No responseTransformer — proxy returns raw API responses.
}
