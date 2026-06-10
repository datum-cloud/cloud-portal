import { OTHER_GROUP } from './service-catalog';

export interface QuotaRow {
  resourceType: string;
  displayName: string;
  group: string;
  percentage: number;
}

export interface QuotaGroup {
  group: string;
  items: QuotaRow[];
}

/**
 * Group quota rows by their resolved service group. Groups sort alphabetically
 * with the Other group last; items within a group sort by usage percentage
 * descending (at-risk first), ties broken by display name. Mirrors the grouping
 * contract documented in the design spec and the select-role component.
 */
export function groupQuotas(rows: QuotaRow[]): QuotaGroup[] {
  const byGroup = new Map<string, QuotaRow[]>();
  for (const r of rows) {
    const list = byGroup.get(r.group) ?? [];
    list.push(r);
    byGroup.set(r.group, list);
  }

  for (const list of byGroup.values()) {
    list.sort((a, b) => {
      if (a.percentage !== b.percentage) {
        return b.percentage - a.percentage;
      }
      return a.displayName.localeCompare(b.displayName);
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
