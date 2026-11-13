import { activeEntitlementServiceIds } from './service-entitlement.adapter';
import {
  createServiceEntitlementService,
  serviceEntitlementKeys,
} from './service-entitlement.service';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

export const ACTIVE_SERVICE_ENTITLEMENTS_STALE_TIME = 60_000;

/**
 * Service ids a project holds an Active ServiceEntitlement for.
 *
 * The project sidebar and home page use it to decide whether a plugin's
 * `comingSoon` nav item renders as a live link or stays Coming Soon, and
 * which gated quotas to show. A failed lookup is not retried and leaves
 * `data` undefined, so callers fall back to "nothing entitled" (sidebar) or
 * "unknown" (quotas) rather than blocking the shell.
 */
export function useActiveServiceEntitlements(
  projectId: string | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<string[]> {
  return useQuery({
    queryKey: serviceEntitlementKeys.active(projectId ?? ''),
    queryFn: async () =>
      activeEntitlementServiceIds(await createServiceEntitlementService().list(projectId ?? '')),
    enabled: !!projectId && options?.enabled !== false,
    staleTime: ACTIVE_SERVICE_ENTITLEMENTS_STALE_TIME,
    retry: false,
  });
}
