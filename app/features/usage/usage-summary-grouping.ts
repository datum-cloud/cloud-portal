import type { UsageSummaryRow } from './usage.types';
import { OTHER_GROUP } from '@/features/quotas/service-catalog';

export interface UsageSummaryGroup {
  group: string;
  items: UsageSummaryRow[];
}

function usagePercentage(row: UsageSummaryRow): number {
  if (row.limit <= 0) return 0;
  return Math.round((row.used / row.limit) * 100);
}

/**
 * Group usage summary rows by service. Groups sort alphabetically with
 * Other last; items within a group sort by quota utilization descending,
 * ties broken by meter label. Mirrors `groupQuotas` in the quotas table.
 */
export function groupUsageSummaryRows(rows: UsageSummaryRow[]): UsageSummaryGroup[] {
  const byGroup = new Map<string, UsageSummaryRow[]>();
  for (const row of rows) {
    const list = byGroup.get(row.group) ?? [];
    list.push(row);
    byGroup.set(row.group, list);
  }

  for (const list of byGroup.values()) {
    list.sort((a, b) => {
      const pctDiff = usagePercentage(b) - usagePercentage(a);
      if (pctDiff !== 0) return pctDiff;
      return a.label.localeCompare(b.label);
    });
  }

  return Array.from(byGroup.entries())
    .map(([group, items]) => ({ group, items }))
    .sort((a, b) => {
      if (a.group === OTHER_GROUP) return 1;
      if (b.group === OTHER_GROUP) return -1;
      return a.group.localeCompare(b.group);
    });
}
