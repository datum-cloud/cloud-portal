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
import { AppError, AuthenticationError, AuthorizationError } from '@/utils/errors';
import { limitAsync } from 'es-toolkit/promise';

/**
 * Constructs the appropriate base URL for the current environment.
 * Gets the base URL from the configured axios instance.
 */
function getScopedBaseUrl(scopePath: string): string {
  const axios = client.getConfig().axios;
  const baseUrl = axios?.defaults?.baseURL || '';
  return `${baseUrl}${scopePath}`;
}

/** Control-plane path (no host) for a user. Uses the iam.miloapis.com group. */
export function getUserControlPlanePath(userId: string): string {
  return `/apis/iam.miloapis.com/v1alpha1/users/${encodeURIComponent(userId)}/control-plane`;
}

/** Control-plane path (no host) for an organization. */
export function getOrganizationControlPlanePath(organizationName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${encodeURIComponent(organizationName)}/control-plane`;
}

/** Control-plane path (no host) for a project. */
export function getProjectControlPlanePath(projectName: string): string {
  return `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${encodeURIComponent(projectName)}/control-plane`;
}

/**
 * Get user-scoped base URL for endpoints that require user context.
 * Uses /users/me/ which gets replaced by axios interceptor with actual userId.
 */
export function getUserScopedBase(userId: string = 'me'): string {
  return getScopedBaseUrl(getUserControlPlanePath(userId));
}

/**
 * Get organization-scoped base URL for endpoints that require org context.
 */
export function getOrgScopedBase(orgId: string): string {
  return getScopedBaseUrl(getOrganizationControlPlanePath(orgId));
}

/**
 * Get project-scoped base URL for endpoints that require project context.
 */
export function getProjectScopedBase(projectId: string): string {
  return getScopedBaseUrl(getProjectControlPlanePath(projectId));
}

/** Most per-org upstream calls one fan-out keeps in flight at a time. */
export const ORG_FAN_OUT_CONCURRENCY = 6;

/**
 * Fan-out a per-org list across the supplied org ids and concatenate the
 * results, tolerating per-org failures.
 *
 * Several `billing.miloapis.com` resources can't be cluster-listed by an
 * end user (the user-scoped IAM proxy doesn't grant cluster-list), so the
 * cross-org views have to hit each org's control-plane individually. This
 * centralizes that fan-out so the three billing services stay in lockstep:
 *
 * - runs the per-org `fn` calls via `Promise.allSettled`, at most
 *   {@link ORG_FAN_OUT_CONCURRENCY} at a time, so a user in many orgs does
 *   not open one upstream connection per org at once,
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
  const limited = limitAsync(fn, ORG_FAN_OUT_CONCURRENCY);
  const results = await Promise.allSettled(orgIds.map((orgId) => limited(orgId)));
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

/** HTTP statuses that mean "you're not authorized yet", which right after an
 * org create is usually a propagation race rather than a real denial. */
const TRANSIENT_AUTH_STATUSES = new Set([401, 403]);

export interface RetryOnTransientAuthErrorOptions {
  /** Total number of attempts (including the first). Defaults to 6. */
  attempts?: number;
  /** Delay before the first retry; doubles each attempt. Defaults to 500ms. */
  baseDelayMs?: number;
  /** Ceiling for the per-attempt backoff delay. Defaults to 8000ms. */
  maxDelayMs?: number;
  /** Label used for the retry log line. */
  operation?: string;
}

/**
 * Retry an operation while it fails with a transient authorization/authentication
 * error (HTTP 401/403).
 *
 * A newly created organization does not authorize its owner instantly: the grant
 * has to travel through an async pipeline (Organization → owner
 * OrganizationMembership → PolicyBinding → IAM/OpenFGA tuple sync) before the
 * caller can act in the org namespace. A write fired in the same breath as the
 * org create can beat that pipeline and come back 403 even though the caller is
 * the owner. Rather than treat that race as a hard failure, back off and retry —
 * the grant typically lands within a second or two, and retrying also rides out
 * the intermittent authorizer identity resolution we see on the create path.
 *
 * Non-auth errors (validation, conflict, 5xx, ...) are re-thrown immediately.
 */
export async function retryOnTransientAuthError<T>(
  fn: () => Promise<T>,
  opts: RetryOnTransientAuthErrorOptions = {}
): Promise<T> {
  const attempts = opts.attempts ?? 6;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 8000;
  const operation = opts.operation ?? 'retryOnTransientAuthError';

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error instanceof AppError ? error.status : undefined;
      const isLastAttempt = attempt === attempts - 1;
      if (status === undefined || !TRANSIENT_AUTH_STATUSES.has(status) || isLastAttempt) {
        throw error;
      }
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      logger.warn(`${operation} got ${status}; retrying after ${delay}ms`, {
        attempt: attempt + 1,
        attempts,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Unreachable: the loop either returns or throws on the last attempt.
  throw lastError;
}
