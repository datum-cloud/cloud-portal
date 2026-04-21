/**
 * Create an Activity API client configured for cloud-portal.
 *
 * Uses /api/proxy as the base URL. Cloud-portal's Hono proxy is a raw
 * passthrough that injects Bearer auth from the session cookie and returns
 * the upstream response as-is (no response envelope, no transformer needed).
 *
 * @param controlPlanePath - Path to the tenant's control plane.
 *   Example: /apis/resourcemanager.miloapis.com/v1alpha1/projects/{name}/control-plane
 */
export function createActivityClientConfig(controlPlanePath?: string) {
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
