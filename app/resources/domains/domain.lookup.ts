import type { Domain } from './domain.schema';
import { logger } from '@/modules/logger';
import { ControlPlaneStatus } from '@/resources/base';
import type { Project } from '@/resources/projects/project.schema';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

const SERVICE_NAME = 'DomainService';

export const SIBLING_LOOKUP_TIMEOUT_MS = 5000;

/** A domain with the same name held by another project in the org, and its verification state. */
export interface SiblingDomainMatch {
  projectId: string;
  projectDisplayName: string;
  domainId: string;
  domainName: string;
  verificationStatus: ControlPlaneStatus;
}

/** Keyed by normalised input domain name. Only keys with ≥1 match are present. */
export type SiblingDomainMatches = Record<string, SiblingDomainMatch[]>;

/** What to look up: the org, the project being added to (excluded), and the names to match. */
export interface FindSiblingDomainsInput {
  orgId: string;
  currentProjectId: string;
  domainNames: string[];
}

/** Injectable data sources and time limit for the lookup; defaults hit the real services. */
export interface FindSiblingDomainsDeps {
  listProjects: (orgId: string) => Promise<Project[]>;
  listDomains: (projectId: string) => Promise<Domain[]>;
  timeoutMs: number;
}

/** Lowercases, trims and drops one trailing dot so equal domains compare equal. */
export function normalizeDomainName(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, '');
}

type ListDeps = Pick<FindSiblingDomainsDeps, 'listProjects' | 'listDomains'>;

async function buildDefaultListDeps(): Promise<ListDeps> {
  const [{ createProjectService }, { createDomainService }] = await Promise.all([
    import('@/resources/projects/project.service'),
    import('./domain.service'),
  ]);
  const projectService = createProjectService();
  const domainService = createDomainService();

  return {
    listProjects: (orgId) => projectService.list(orgId).then((r) => r.items),
    listDomains: (projectId) => domainService.list(projectId),
  };
}

const TIMED_OUT = Symbol('timed-out');

function isSkippableAuthError(error: unknown): boolean {
  return error instanceof AuthorizationError || error instanceof AuthenticationError;
}

function toMatch(sibling: Project, domain: Domain): SiblingDomainMatch {
  return {
    projectId: sibling.name,
    projectDisplayName: sibling.displayName,
    domainId: domain.name,
    domainName: domain.domainName,
    verificationStatus: transformControlPlaneStatus(domain.status).status,
  };
}

async function collectMatches(
  input: FindSiblingDomainsInput,
  deps: FindSiblingDomainsDeps,
  wanted: Set<string>,
  onSiblingCount: (count: number) => void
): Promise<SiblingDomainMatches> {
  const projects = await deps.listProjects(input.orgId);
  const siblings = projects.filter((p) => p.name !== input.currentProjectId);
  onSiblingCount(siblings.length);

  const settled = await Promise.allSettled(siblings.map((p) => deps.listDomains(p.name)));

  const matches = new Map<string, SiblingDomainMatch[]>();
  settled.forEach((outcome, index) => {
    const sibling = siblings[index];

    if (outcome.status === 'rejected') {
      // DomainService.list already logs the failure at error level; warn here, once per sibling.
      if (!isSkippableAuthError(outcome.reason)) {
        logger.warn(`${SERVICE_NAME}.findSiblingDomains skipped a sibling project`, {
          projectId: sibling.name,
        });
      }
      return;
    }

    for (const domain of outcome.value) {
      const key = normalizeDomainName(domain.domainName);
      if (!wanted.has(key)) continue;

      matches.set(key, [...(matches.get(key) ?? []), toMatch(sibling, domain)]);
    }
  });

  return Object.fromEntries(
    [...matches].map(([key, list]) => [
      key,
      [...list].sort((a, b) => a.projectDisplayName.localeCompare(b.projectDisplayName)),
    ])
  );
}

async function resolveDeps(
  deps?: Partial<FindSiblingDomainsDeps>
): Promise<FindSiblingDomainsDeps> {
  const lists: ListDeps =
    deps?.listProjects && deps.listDomains
      ? { listProjects: deps.listProjects, listDomains: deps.listDomains }
      : {
          ...(await buildDefaultListDeps()),
          ...(deps?.listProjects && { listProjects: deps.listProjects }),
          ...(deps?.listDomains && { listDomains: deps.listDomains }),
        };
  return { ...lists, timeoutMs: deps?.timeoutMs ?? SIBLING_LOOKUP_TIMEOUT_MS };
}

async function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Finds domains already held by other projects in the org. Never throws: 403/401 siblings are
 * skipped, other failures are logged, and a timeout resolves to no matches.
 */
export async function findSiblingDomains(
  input: FindSiblingDomainsInput,
  deps?: Partial<FindSiblingDomainsDeps>
): Promise<SiblingDomainMatches> {
  const startTime = Date.now();
  let projectCount = 0;
  let result: SiblingDomainMatches = {};

  try {
    const resolved = await resolveDeps(deps);
    const wanted = new Set(input.domainNames.map(normalizeDomainName));
    const outcome = await raceWithTimeout(
      collectMatches(input, resolved, wanted, (count) => {
        projectCount = count;
      }),
      resolved.timeoutMs
    );

    if (outcome === TIMED_OUT) {
      logger.warn(`${SERVICE_NAME}.findSiblingDomains timed out`, {
        orgId: input.orgId,
        projectCount,
      });
    } else {
      result = outcome;
    }
  } catch (error) {
    if (!isSkippableAuthError(error)) {
      logger.error(`${SERVICE_NAME}.findSiblingDomains failed`, error as Error);
    }
  }

  logger.service(SERVICE_NAME, 'findSiblingDomains', {
    input: { orgId: input.orgId, projectCount, matched: Object.keys(result).length },
    duration: Date.now() - startTime,
  });

  return result;
}
