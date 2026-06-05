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
import { logger } from '@/modules/logger';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';

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

/**
 * Fan-out a per-org list across the supplied org ids and concatenate the
 * results, tolerating per-org failures.
 *
 * Several `billing.miloapis.com` resources can't be cluster-listed by an
 * end user (the user-scoped IAM proxy doesn't grant cluster-list), so the
 * cross-org views have to hit each org's control-plane individually. This
 * centralizes that fan-out so the three billing services stay in lockstep:
 *
 * - runs every per-org `fn` concurrently via `Promise.allSettled`,
 * - swallows `AuthorizationError` / `AuthenticationError` (routine for an
 *   org the user can enumerate but whose billing they can't read, or one
 *   they were just removed from) so a single bad org doesn't blank the
 *   whole list,
 * - logs any other rejection (keyed by the failing org id) for
 *   observability,
 * - emits one `logger.service` timing entry for the aggregate call.
 *
 * `ctx.operation` defaults to `'listForOrgs'` to match the call site that
 * historically owned this loop; pass a different label for other fan-outs.
 */
export async function fanOutAcrossOrgs<T>(
  orgIds: readonly string[],
  fn: (orgId: string) => Promise<T[]>,
  ctx: { service: string; operation?: string }
): Promise<T[]> {
  const operation = ctx.operation ?? 'listForOrgs';
  const startTime = Date.now();
  const results = await Promise.allSettled(orgIds.map((orgId) => fn(orgId)));
  const items: T[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      items.push(...result.value);
      continue;
    }
    const error = result.reason;
    if (error instanceof AuthorizationError || error instanceof AuthenticationError) {
      continue;
    }
    logger.error(`${ctx.service}.${operation}[${orgIds[i]}] failed`, error as Error);
  }
  logger.service(ctx.service, operation, {
    input: { orgCount: orgIds.length },
    duration: Date.now() - startTime,
  });
  return items;
}
