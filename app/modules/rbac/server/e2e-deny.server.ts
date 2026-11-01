/**
 * Test-only permission deny hook for `cypress/e2e/regression/rbac-denials*`.
 *
 * Route loaders decide access server-side through a real
 * SelfSubjectAccessReview, which `cy.intercept` cannot reach. Cypress sets the
 * `e2e-deny` cookie (see `cy.denyPermissions`) to a comma-separated list of
 * `resource:verb` or `group:resource:verb` pairs, and `RbacService` reports a
 * deny for matching checks without calling upstream.
 *
 * The hook only ever turns an answer into a deny, never into an allow, and it
 * is inert unless BOTH `CYPRESS=true` and `NODE_ENV` is not `production`.
 * Outside that environment the cookie is ignored.
 */
import { getRequestContext } from '@/modules/axios/request-context';

export const E2E_DENY_COOKIE = 'e2e-deny';

/** The reason attached to a deny forced by this hook. */
export const E2E_DENY_REASON = 'Denied by e2e-deny test hook';

interface DenyEnv {
  CYPRESS?: string;
  NODE_ENV?: string;
}

interface DenyCheck {
  resource: string;
  verb: string;
  group?: string;
}

/** True only in a Cypress run that is not a production build. */
export function isE2eDenyActive(envVars: DenyEnv = process.env): boolean {
  return envVars.CYPRESS === 'true' && envVars.NODE_ENV !== 'production';
}

/** Reads the deny list from a Cookie header; malformed input yields an empty list. */
export function parseE2eDenyCookie(cookieHeader: string | null | undefined): Set<string> {
  if (!cookieHeader) return new Set();

  const prefix = `${E2E_DENY_COOKIE}=`;
  const raw = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!raw) return new Set();

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return new Set();
  }

  return new Set(
    decoded
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );
}

/** Whether the deny list names this check, by `resource:verb` or `group:resource:verb`. */
export function matchesE2eDeny(denied: ReadonlySet<string>, check: DenyCheck): boolean {
  if (denied.size === 0) return false;
  if (denied.has(`${check.resource}:${check.verb}`)) return true;
  return Boolean(check.group) && denied.has(`${check.group}:${check.resource}:${check.verb}`);
}

/**
 * Whether the current request asked to deny this check. Reads the Cookie
 * header kept in the request context; returns false when the hook is inactive.
 */
export function isForcedE2eDeny(
  check: DenyCheck,
  cookieHeader: string | null | undefined = getRequestContext()?.cookieHeader,
  envVars: DenyEnv = process.env
): boolean {
  if (!isE2eDenyActive(envVars)) return false;
  return matchesE2eDeny(parseE2eDenyCookie(cookieHeader), check);
}
