/**
 * List Active ServiceEntitlements for a project — CLIENT-SAFE.
 *
 * Used by the project sidebar to decide whether a plugin's `comingSoon` nav
 * item should render as a live mount link (entitled) or soft-launch Coming
 * Soon (holding page / plugin landing / external). Host planned-services are
 * unaffected.
 *
 * Matching keys are the service's canonical reverse-DNS id
 * (`status.serviceName`, e.g. `compute.datumapis.com`) plus
 * `spec.serviceRef.name` (Service object name or canonical, depending on how
 * the entitlement was written). Entitlement `metadata.name` is NOT used —
 * it is an opaque object name like `my-project--compute-miloapis-com`.
 */
import { getProjectScopedBase } from '@/resources/base/utils';
import { serviceEntitlementKeys } from '@/resources/service-entitlements';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

const SERVICE_ENTITLEMENTS_PATH = '/apis/services.miloapis.com/v1alpha1/serviceentitlements';

type RawServiceEntitlementList = {
  items?: Array<{
    metadata?: { name?: string };
    spec?: { serviceRef?: { name?: string } };
    status?: { phase?: string; serviceName?: string };
  }>;
};

export { serviceEntitlementKeys };

/**
 * Collect the identifiers a plugin `serviceRef` may match for an Active
 * entitlement. Prefer the controller-stamped canonical `status.serviceName`.
 */
function entitlementServiceIds(
  item: NonNullable<RawServiceEntitlementList['items']>[number]
): string[] {
  const ids: string[] = [];
  const canonical = item.status?.serviceName?.trim();
  const ref = item.spec?.serviceRef?.name?.trim();
  if (canonical) ids.push(canonical);
  if (ref && ref !== canonical) ids.push(ref);
  return ids;
}

/**
 * Fetch Active ServiceEntitlement service ids for a project.
 *
 * Failures resolve to an empty set so the sidebar still renders (Coming Soon
 * stays Coming Soon) rather than blocking the shell.
 */
export async function fetchActiveServiceEntitlementNames(projectId: string): Promise<string[]> {
  const base = getProjectScopedBase(projectId);
  const response = await fetch(`${base}${SERVICE_ENTITLEMENTS_PATH}?limit=500`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!response.ok) {
    throw new Error(`Failed to load service entitlements (${response.status})`);
  }
  const body = (await response.json()) as RawServiceEntitlementList;
  const ids = new Set<string>();
  for (const item of body.items ?? []) {
    if (item.status?.phase !== 'Active') continue;
    for (const id of entitlementServiceIds(item)) {
      ids.add(id);
    }
  }
  return [...ids];
}

export function useActiveServiceEntitlements(
  projectId: string | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<string[]> {
  return useQuery({
    queryKey: serviceEntitlementKeys.active(projectId ?? ''),
    queryFn: () => fetchActiveServiceEntitlementNames(projectId as string),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: 60_000,
    retry: false,
  });
}
