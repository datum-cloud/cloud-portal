/**
 * Shared rules for `cy.denyPermissions` (registered in e2e.ts).
 *
 * One deny list drives both sides of a permission check in a test:
 * - server-side loader gates read it from the `e2e-deny` cookie
 *   (app/modules/rbac/server/e2e-deny.server.ts, active only when the app runs
 *   with CYPRESS=true outside production);
 * - client-side gates get it from the `/api/permissions/*` intercepts built here.
 *
 * Entries are `resource:verb` (any API group) or `group:resource:verb`. This
 * module has no Cypress globals so bun can test it.
 */

/** Must match E2E_DENY_COOKIE in app/modules/rbac/server/e2e-deny.server.ts. */
export const E2E_DENY_COOKIE = 'e2e-deny';

export type DenyEntry = `${string}:${string}`;

export interface PermissionCheckBody {
  resource: string;
  verb: string;
  group?: string;
  namespace?: string;
  name?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  denied: boolean;
}

export interface BulkPermissionCheckResult extends PermissionCheckResult {
  request: {
    resource: string;
    verb: string;
    group: string;
    namespace?: string;
    name?: string;
  };
}

/** Cookie value for a deny list; URI-encoded because `,` is not a cookie octet. */
export function denyCookieValue(entries: readonly DenyEntry[]): string {
  return encodeURIComponent(entries.join(','));
}

/** Same matching as the server hook: `resource:verb`, or `group:resource:verb` for that group. */
export function isDenied(denied: ReadonlySet<string>, check: PermissionCheckBody): boolean {
  if (denied.has(`${check.resource}:${check.verb}`)) return true;
  return Boolean(check.group) && denied.has(`${check.group}:${check.resource}:${check.verb}`);
}

/** Reply body data for `POST /api/permissions/check`. */
export function checkResult(
  denied: ReadonlySet<string>,
  check: PermissionCheckBody
): PermissionCheckResult {
  const deny = isDenied(denied, check);
  return { allowed: !deny, denied: deny };
}

/** Reply body data for `POST /api/permissions/bulk-check`, one result per check, in order. */
export function bulkCheckResults(
  denied: ReadonlySet<string>,
  checks: readonly PermissionCheckBody[]
): BulkPermissionCheckResult[] {
  return checks.map((check) => ({
    ...checkResult(denied, check),
    request: {
      resource: check.resource,
      verb: check.verb,
      group: check.group ?? '',
      namespace: check.namespace,
      name: check.name,
    },
  }));
}

/** Reads the `checks` array from a bulk-check request body; anything else yields []. */
export function readBulkChecks(body: unknown): PermissionCheckBody[] {
  if (!body || typeof body !== 'object') return [];
  const checks = (body as { checks?: unknown }).checks;
  return Array.isArray(checks) ? (checks as PermissionCheckBody[]) : [];
}
