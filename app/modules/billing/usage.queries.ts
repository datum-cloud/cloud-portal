import type { OrgUsageDashboardData } from './usage.types';
import { gatedFetch } from '@/modules/rate-limit';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/**
 * `organization` reads in the org's context (optionally narrowed to one
 * project); `project` reads in the project's own context.
 */
export type UsageDashboardScope = 'organization' | 'project';

export const usageKeys = {
  all: ['org-usage'] as const,
  dashboard: (orgId: string, project: string, cycle: string, scope: UsageDashboardScope) =>
    [...usageKeys.all, 'dashboard', orgId, project, cycle, scope] as const,
};

export async function fetchOrgUsageDashboard(params: {
  orgId: string;
  project: string;
  cycle: string;
  scope: UsageDashboardScope;
}): Promise<OrgUsageDashboardData> {
  const search = new URLSearchParams({
    orgId: params.orgId,
    project: params.project,
    cycle: params.cycle,
    scope: params.scope,
  });

  const response = await gatedFetch(`/api/usage?${search.toString()}`);
  const body = (await response.json().catch(() => ({}))) as OrgUsageDashboardData & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.message ?? 'Failed to load usage data');
  }

  return body;
}

export function useOrgUsageDashboard(
  orgId: string,
  project: string,
  cycle: string,
  scope: UsageDashboardScope,
  options?: Omit<UseQueryOptions<OrgUsageDashboardData>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: usageKeys.dashboard(orgId, project, cycle, scope),
    queryFn: () => fetchOrgUsageDashboard({ orgId, project, cycle, scope }),
    enabled: !!orgId,
    staleTime: QUERY_STALE_TIME,
    placeholderData: (previous) => previous,
    ...options,
  });
}
