import { createDomainService, domainKeys, type Domain } from '@/resources/domains';
import { useProjects, type Project } from '@/resources/projects';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

/** A domain name found in one or more of the organization's projects. */
export interface OrganizationDomain {
  domainName: string;
  /** Whether a ready project has a Domain for it with Verified=True. */
  verified: boolean;
  /** Projects with a Domain for this name, verified ones first. */
  projects: { id: string; displayName: string; domainId: string; verified: boolean }[];
}

type Condition = { type?: string; status?: string };

function hasTrueCondition(status: unknown, type: string): boolean {
  const conditions = (status as { conditions?: Condition[] } | undefined)?.conditions ?? [];
  return conditions.some((condition) => condition.type === type && condition.status === 'True');
}

/**
 * Groups the Domains of the organization's projects by domain name, the way
 * milo decides what an organization may offer membership to: a Domain counts
 * only when its project is Ready and the Domain's Verified condition is True.
 */
export function collectOrganizationDomains(
  projects: Pick<Project, 'name' | 'displayName' | 'status'>[],
  domainsByProject: Record<string, Pick<Domain, 'name' | 'domainName' | 'status'>[] | undefined>
): OrganizationDomain[] {
  const byName = new Map<string, OrganizationDomain>();

  for (const project of projects) {
    const projectReady = hasTrueCondition(project.status, 'Ready');
    for (const domain of domainsByProject[project.name] ?? []) {
      const domainName = domain.domainName.toLowerCase().replace(/\.$/, '');
      const verified = projectReady && hasTrueCondition(domain.status, 'Verified');
      const entry = byName.get(domainName) ?? { domainName, verified: false, projects: [] };
      entry.verified ||= verified;
      entry.projects.push({
        id: project.name,
        displayName: project.displayName || project.name,
        domainId: domain.name,
        verified,
      });
      byName.set(domainName, entry);
    }
  }

  return [...byName.values()]
    .map((entry) => ({
      ...entry,
      projects: entry.projects.sort((a, b) => Number(b.verified) - Number(a.verified)),
    }))
    .sort(
      (a, b) => Number(b.verified) - Number(a.verified) || a.domainName.localeCompare(b.domainName)
    );
}

/**
 * Lists the Domains in every project of the organization. A project whose
 * Domains can't be read is skipped and reported in `failedProjects`, so one
 * broken project doesn't hide the others.
 */
export function useOrganizationDomains(orgId: string) {
  const projectsQuery = useProjects(orgId);
  const projects = useMemo(() => projectsQuery.data?.items ?? [], [projectsQuery.data]);

  const domainQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: domainKeys.list(project.name),
      queryFn: () => createDomainService().list(project.name),
      retry: false,
    })),
  });

  const domainsByProject = Object.fromEntries(
    projects.map((project, index) => [project.name, domainQueries[index]?.data])
  );

  return {
    domains: collectOrganizationDomains(projects, domainsByProject),
    isLoading: projectsQuery.isLoading || domainQueries.some((query) => query.isLoading),
    error: projectsQuery.error,
    failedProjects: projects.filter((_, index) => domainQueries[index]?.isError).map((p) => p.name),
  };
}
