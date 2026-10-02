import type { UsageFetchResult } from './usage.types';
import { isServiceVisible } from '@/modules/entitlements/entitled-services';

/**
 * Drop usage groups for entitlement-gated services the scope is not entitled
 * to, along with their meters, so the dashboard only shows what the projects
 * can use. Unknown entitlements (`null`) or a result without groups pass
 * through untouched. Never mutates the input.
 */
export function filterUsageByEntitlement(
  result: UsageFetchResult,
  entitledServiceIds: ReadonlySet<string> | null
): UsageFetchResult {
  if (entitledServiceIds === null || !result.groups) return result;

  const groups = result.groups.filter((group) => isServiceVisible(group.id, entitledServiceIds));
  if (groups.length === result.groups.length) return result;

  const keptMeters = new Set(groups.flatMap((group) => group.meterApiNames));
  return {
    ...result,
    groups,
    meters: result.meters.filter((meter) => keptMeters.has(meter.meterApiName)),
  };
}
