import { resolvePostLoginDestination } from './post-login-destination';

/** Reads made with the NEW access token; each throws when the user cannot see the resource. */
export interface ReturnToAccess {
  getOrganization: (orgId: string) => Promise<unknown>;
  getProject: (projectId: string) => Promise<unknown>;
}

export interface ResolveReturnToInput {
  /** Saved redirect intent, if any. */
  intentPath: string | null | undefined;
  /** User id the intent was saved for; absent for a fresh visit. */
  intentSub: string | null | undefined;
  /** User id of the login that just completed. */
  sub: string;
  allowedOrigins: string[];
  fallback: string;
  access: ReturnToAccess;
}

/** Kubernetes resource names (DNS-1123 subdomain); anything else is not a real org/project id. */
const RESOURCE_NAME = /^[a-z0-9]([-a-z0-9.]{0,251}[a-z0-9])?$/;

type AccessRule =
  | { kind: 'allow' }
  | { kind: 'org'; id: string }
  | { kind: 'project'; id: string }
  | { kind: 'deny' };

function accessRuleFor(pathname: string): AccessRule {
  const [first, second] = pathname.split('/').filter(Boolean);
  if (first === 'account' || (first === 'invitation' && second)) return { kind: 'allow' };
  if (first === 'org' && second && RESOURCE_NAME.test(second)) return { kind: 'org', id: second };
  if (first === 'project' && second && RESOURCE_NAME.test(second)) {
    return { kind: 'project', id: second };
  }
  return { kind: 'deny' };
}

/**
 * Decides where to send the user after login, given the page saved before it.
 *
 * The saved page is restored only when it passes the open-redirect check, was
 * saved for this same user (when a user id was stored), and the new access
 * token can reach it: account and invitation pages always, an org or project
 * page only when that org or project can be fetched. Everything else, and any
 * failed fetch, falls back. An allowlisted website URL (the website sign-in
 * flow) is kept as is: it is not a portal page.
 */
export async function resolveReturnTo(input: ResolveReturnToInput): Promise<string> {
  const { intentPath, intentSub, sub, allowedOrigins, fallback, access } = input;

  const destination = resolvePostLoginDestination(intentPath, allowedOrigins, fallback);
  if (destination === fallback) return fallback;
  if (intentSub && intentSub !== sub) return fallback;
  if (!destination.startsWith('/')) return destination;

  const rule = accessRuleFor(new URL(destination, 'http://portal.invalid').pathname);
  try {
    switch (rule.kind) {
      case 'allow':
        return destination;
      case 'org':
        await access.getOrganization(rule.id);
        return destination;
      case 'project':
        await access.getProject(rule.id);
        return destination;
      default:
        return fallback;
    }
  } catch {
    return fallback;
  }
}
