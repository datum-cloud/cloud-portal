import { unionActiveServiceIds } from './entitled-services';
import { logger } from '@/modules/logger';
import { createServiceEntitlementService } from '@/resources/service-entitlements';

/**
 * Active entitlement service ids across a set of projects, SERVER-ONLY.
 *
 * One control-plane list per project, in parallel. A failing project is
 * skipped and logged; when nothing usable comes back the result is `null` so
 * callers fail open rather than hiding every gated service.
 */
export async function resolveEntitledServiceIds(
  projectIds: readonly string[]
): Promise<Set<string> | null> {
  if (projectIds.length === 0) return null;

  const service = createServiceEntitlementService();
  const results = await Promise.allSettled(projectIds.map((projectId) => service.list(projectId)));

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn('Service entitlement lookup failed; treating scope as unknown for this project', {
        projectId: projectIds[index],
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  return unionActiveServiceIds(results);
}
