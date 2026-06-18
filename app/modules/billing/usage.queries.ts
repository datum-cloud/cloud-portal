import type { OrgUsageDashboardData } from './usage.types';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export const usageKeys = {
  all: ['org-usage'] as const,
  dashboard: (orgId: string, project: string, cycle: string) =>
    [...usageKeys.all, 'dashboard', orgId, project, cycle] as const,
};

export async function fetchOrgUsageDashboard(params: {
  orgId: string;
  project: string;
  cycle: string;
}): Promise<OrgUsageDashboardData> {
  const search = new URLSearchParams({
    orgId: params.orgId,
    project: params.project,
    cycle: params.cycle,
  });

  const response = await fetch(`/api/usage?${search.toString()}`);
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
  options?: Omit<UseQueryOptions<OrgUsageDashboardData>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: usageKeys.dashboard(orgId, project, cycle),
    queryFn: () => fetchOrgUsageDashboard({ orgId, project, cycle }),
    enabled: !!orgId,
    staleTime: QUERY_STALE_TIME,
    placeholderData: (previous) => previous,
    ...options,
  });
}
