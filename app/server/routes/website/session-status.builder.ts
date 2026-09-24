import { settle } from './settle';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

export type SessionStatus =
  | { signedIn: false }
  | {
      signedIn: true;
      user: { displayName: string; email?: string; avatarUrl?: string };
      org?: { name: string; displayName: string };
      dashboardUrl: string;
      state?: 'new' | 'active';
    };

export interface SessionStatusDeps {
  getUser(
    sub: string
  ): Promise<{
    givenName?: string;
    familyName?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  }>;
  listOrganizations(): Promise<Array<{ name: string; displayName: string }>>;
  hasProjects(orgName: string): Promise<boolean>;
  /** Org name from the portal's last-used-org cookie, or null. */
  preferredOrg: string | null;
  /** Portal origin, no trailing slash. */
  appUrl: string;
  timeoutMs: number;
  /** Clock used to compute the shared deadline; defaults to `Date.now` (tests control it). */
  now?: () => number;
}

export function pickOrganization<T extends { name: string }>(
  memberships: T[],
  preferred: string | null
): T | undefined {
  return memberships.find((o) => o.name === preferred) ?? memberships[0];
}

/** The full name as the portal shows it; the website decides how to truncate it. */
export function fullDisplayName(u: {
  givenName?: string;
  familyName?: string;
  fullName?: string;
}): string {
  const joined = [u.givenName?.trim(), u.familyName?.trim()].filter(Boolean).join(' ');
  return joined || (u.fullName?.trim() ?? '');
}

/**
 * Builds the display payload for a validated session. Session validity is decided
 * by the caller; every lookup here is enrichment, so a failure drops fields
 * rather than flipping `signedIn`.
 */
export async function buildSessionStatus(
  sub: string,
  deps: SessionStatusDeps
): Promise<SessionStatus> {
  const now = deps.now ?? Date.now;
  const deadline = now() + deps.timeoutMs;
  const onboardingUrl = `${deps.appUrl}${paths.onboarding.root}`;

  const [rawUser, orgs] = await Promise.all([
    settle(deps.getUser(sub), deps.timeoutMs),
    settle(deps.listOrganizations(), deps.timeoutMs),
  ]);

  const user: { displayName: string; email?: string; avatarUrl?: string } = {
    displayName: fullDisplayName(rawUser ?? {}),
  };
  if (rawUser?.email) user.email = rawUser.email;
  if (rawUser?.avatarUrl) user.avatarUrl = rawUser.avatarUrl;

  const memberships = orgs ?? [];
  const rawOrg = pickOrganization(memberships, deps.preferredOrg);
  const org = rawOrg ? { name: rawOrg.name, displayName: rawOrg.displayName } : undefined;

  if (!org) {
    return { signedIn: true, user, dashboardUrl: onboardingUrl, state: 'new' };
  }

  const projectsUrl = `${deps.appUrl}${getPathWithParams(paths.org.detail.projects.root, { orgId: org.name })}`;
  const hasProjects = await settle(deps.hasProjects(org.name), Math.max(0, deadline - now()));

  if (hasProjects === undefined) {
    return { signedIn: true, user, org, dashboardUrl: projectsUrl };
  }
  if (!hasProjects) {
    return { signedIn: true, user, org, dashboardUrl: onboardingUrl, state: 'new' };
  }
  return { signedIn: true, user, org, dashboardUrl: projectsUrl, state: 'active' };
}
