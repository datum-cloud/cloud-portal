import { recordDenial } from '../observability/metrics';
import { RbacService } from './rbac.service';
import type { SupportedVerb } from '@/resources/access-review';

export interface LoaderPermissionCheck {
  resource: string;
  verb: SupportedVerb;
  group?: string;
  namespace?: string;
  name?: string;
  scope?: 'org' | 'user' | 'project';
  projectId?: string;
}

/**
 * Fail-closed boolean permission check for SSR loaders.
 * Wraps RbacService.checkPermission; returns false on any error.
 *
 * Pair the returned flag with `<RestrictedState>` to gate route access or
 * editor affordances inline, instead of redirecting/throwing.
 */
export async function canInLoader(
  organizationId: string,
  check: LoaderPermissionCheck
): Promise<boolean> {
  return new RbacService()
    .checkPermission(organizationId, check)
    .then((r) => r.allowed && !r.denied)
    .catch(() => false);
}

/**
 * Stable identity of a check as the authorizer actually sees it, used to
 * collapse duplicates inside a single `canInLoaderBulk` call.
 *
 * Mirrors the normalization in `RbacService` (rbac.service.ts) exactly — get
 * this wrong in either direction and we either merge two genuinely different
 * requests or fan out two identical ones:
 * - `scope` defaults to 'org' in both `resolveBaseURL` and `resolveNamespace`
 *   (NOT 'project' — that default lives in the loader runtime, not here).
 * - `group` is normalized with `check.group || ''`, so '' and undefined are the
 *   same wire value.
 * - `namespace` is NOT: `resolveNamespace` branches on `!== undefined`, so ''
 *   (cluster-scoped) and undefined (derive from scope) are different requests.
 * - `name` is passed through verbatim; undefined omits it from the payload.
 *
 * `organizationId` is deliberately absent: it is a parameter of the batch, so
 * it is constant across every element. Revisit if the signature ever accepts
 * per-check organizations.
 */
function checkIdentity(check: LoaderPermissionCheck): string {
  return JSON.stringify([
    check.scope ?? 'org',
    check.projectId ?? null,
    check.namespace ?? null,
    check.group || '',
    check.resource,
    check.verb,
    check.name ?? null,
  ]);
}

/**
 * Fail-closed bulk permission check for SSR loaders. The bulk sibling of
 * {@link canInLoader}: returns one boolean per input check, in input order.
 *
 * Records NO metrics. Callers decide when a `false` is a denial worth counting
 * and call {@link recordGateDenial} at that point — which is what lets a loader
 * resolve every verdict up front (in parallel) while still recording denials
 * only for the gates it actually acts on, keeping counts identical to a
 * sequential gate-by-gate flow.
 *
 * Identical checks are collapsed into a single SelfSubjectAccessReview and the
 * verdict fanned back out. That is safe because an SSAR is a pure function of
 * (caller identity, base URL, resource attributes), and identity is a token
 * read from AsyncLocalStorage that is fixed for the request — two identical
 * checks cannot deserve two different answers. Dedupe never spans calls: there
 * is no cache here, by design. A TTL'd allow-cache is a security change and
 * does not belong in this module.
 */
export async function canInLoaderBulk(
  organizationId: string,
  checks: readonly LoaderPermissionCheck[]
): Promise<boolean[]> {
  if (checks.length === 0) {
    return [];
  }

  const slotOf = new Map<string, number>();
  const unique: LoaderPermissionCheck[] = [];
  const slots = checks.map((check) => {
    const key = checkIdentity(check);
    const existing = slotOf.get(key);
    if (existing !== undefined) {
      return existing;
    }
    slotOf.set(key, unique.length);
    unique.push(check);
    return unique.length - 1;
  });

  // `checkPermissions` already fails closed per item; the catch covers the
  // whole-call rejection it does not handle (e.g. the access-review factory
  // throwing), mirroring `canInLoader`'s `.catch(() => false)`.
  const results = await new RbacService()
    .checkPermissions(organizationId, unique)
    .catch(() => [] as Array<{ allowed: boolean; denied: boolean }>);

  // A missing element means the bulk call failed or came back short — deny.
  return slots.map((slot) => {
    const result = results[slot];
    return result ? result.allowed && !result.denied : false;
  });
}

/**
 * Record the route-access denial metric/audit for a check whose verdict came
 * back false. Split out of {@link gateRouteAccess} so bulk callers can resolve
 * verdicts eagerly while still recording a denial only at the point the verdict
 * is consumed. Use ONLY for gating route access (not for capability flags like
 * canManageRoles).
 */
export function recordGateDenial(check: LoaderPermissionCheck): void {
  recordDenial(check.resource, check.verb);
}

/**
 * Route-access gate for SSR loaders. Same as canInLoader, but records a
 * denial metric/audit when access is refused. Use ONLY for gating route
 * access (not for capability flags like canManageRoles).
 */
export async function gateRouteAccess(
  organizationId: string,
  check: LoaderPermissionCheck
): Promise<boolean> {
  const allowed = await canInLoader(organizationId, check);
  if (!allowed) {
    recordGateDenial(check);
  }
  return allowed;
}
