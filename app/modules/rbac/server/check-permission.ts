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
    recordDenial(check.resource, check.verb);
  }
  return allowed;
}
