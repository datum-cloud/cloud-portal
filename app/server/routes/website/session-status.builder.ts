import { settle } from './settle';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

export type SessionStatus =
  | { signedIn: false }
  | {
      signedIn: true;
      user: { id: string; displayName: string; email?: string; avatarUrl?: string };
      org?: {
        name: string;
        displayName: string;
        hasProjects?: boolean;
        /**
         * True when the org is known to be the one the user works in: it came
         * from the `_org` cookie, it is the user's only org, or a valid project
         * confirms it. False means `pickOrganization` fell back to the first
         * membership, which is fine for a label but not for a pasted command.
         */
        selected: boolean;
      };
      project?: { name: string; displayName: string };
      dashboardUrl: string;
      state?: 'new' | 'active';
    };

export interface SessionStatusDeps {
  getUser(sub: string): Promise<{
    givenName?: string;
    familyName?: string;
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  }>;
  listOrganizations(): Promise<Array<{ name: string; displayName: string }>>;
  hasProjects(orgName: string): Promise<boolean>;
  getProject(name: string): Promise<ProjectCandidate>;
  /** Org name from the portal's last-used-org cookie, or null. */
  preferredOrg: string | null;
  /** Project name from the portal's `_project` cookie, or null. */
  preferredProject: string | null;
  /** Portal origin, no trailing slash. */
  appUrl: string;
  timeoutMs: number;
  /** Clock used to compute the shared deadline; defaults to `Date.now` (tests control it). */
  now?: () => number;
}

/** What the portal knows about the project named in the `_project` cookie. */
export interface ProjectCandidate {
  name: string;
  displayName: string;
  organizationId: string;
  deletionTimestamp?: Date;
}

/**
 * Decides whether the project from the `_project` cookie can be shown for
 * `orgName`, the org this payload is about.
 *
 * The cookie is independent of the org pick: it can name a project in another
 * org, one the user lost access to (the lookup then fails and `candidate` is
 * undefined), or one that is being deleted. Returning undefined leaves
 * `project` off the payload, and the docs keep their placeholder.
 */
export function pickProject(
  candidate: ProjectCandidate | undefined,
  orgName: string
): { name: string; displayName: string } | undefined {
  if (!candidate || candidate.deletionTimestamp) return undefined;
  // The adapter falls back to '' when `spec.ownerRef` is missing, so an empty
  // owner is treated as unknown rather than matched.
  if (!candidate.organizationId || candidate.organizationId !== orgName) return undefined;
  return { name: candidate.name, displayName: candidate.displayName };
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
  const organizationsUrl = `${deps.appUrl}${paths.account.organizations.root}`;

  // The project lookup needs only the cookie, not the org pick, so it runs
  // alongside the others and adds nothing to the deadline.
  const [rawUser, orgs, projectCandidate] = await Promise.all([
    settle(deps.getUser(sub), deps.timeoutMs),
    settle(deps.listOrganizations(), deps.timeoutMs),
    deps.preferredProject
      ? settle(deps.getProject(deps.preferredProject), deps.timeoutMs)
      : Promise.resolve(undefined),
  ]);

  const user: { id: string; displayName: string; email?: string; avatarUrl?: string } = {
    id: sub,
    displayName: fullDisplayName(rawUser ?? {}),
  };
  if (rawUser?.email) user.email = rawUser.email;
  if (rawUser?.avatarUrl) user.avatarUrl = rawUser.avatarUrl;

  const memberships = orgs ?? [];
  const rawOrg = pickOrganization(memberships, deps.preferredOrg);
  const org = rawOrg
    ? {
        name: rawOrg.name,
        displayName: rawOrg.displayName,
        selected: rawOrg.name === deps.preferredOrg || memberships.length === 1,
      }
    : undefined;

  if (!org) {
    return { signedIn: true, user, dashboardUrl: organizationsUrl, state: 'new' };
  }

  // A project in the selected org already proves the org has one, so the
  // hasProjects lookup is skipped.
  const project = pickProject(projectCandidate, org.name);
  if (project) {
    return {
      signedIn: true,
      user,
      // The user entered this project, and it belongs to this org.
      org: { ...org, hasProjects: true, selected: true },
      project,
      dashboardUrl: `${deps.appUrl}${getPathWithParams(paths.project.detail.home, { projectId: project.name })}`,
      state: 'active',
    };
  }

  const projectsUrl = `${deps.appUrl}${getPathWithParams(paths.org.detail.projects.root, { orgId: org.name })}`;
  const hasProjects = await settle(deps.hasProjects(org.name), Math.max(0, deadline - now()));

  // A timed-out or failed lookup leaves `hasProjects` off the org entirely.
  // Defaulting it to false would tell the website "no projects" whenever Milo
  // blips, and it would render the wrong call to action on that basis.
  if (hasProjects === undefined) {
    return { signedIn: true, user, org, dashboardUrl: projectsUrl };
  }
  const orgWithProjects = { ...org, hasProjects };
  if (!hasProjects) {
    return {
      signedIn: true,
      user,
      org: orgWithProjects,
      dashboardUrl: `${projectsUrl}?action=create`,
      state: 'new',
    };
  }
  return { signedIn: true, user, org: orgWithProjects, dashboardUrl: projectsUrl, state: 'active' };
}
