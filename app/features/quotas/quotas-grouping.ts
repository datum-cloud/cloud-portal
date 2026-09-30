import {
  OTHER_GROUP,
  resolveResourceDisplayName,
  resolveServiceDisplayName,
  resolveServiceName,
} from './service-catalog';
import { isServiceVisible } from '@/modules/entitlements/entitled-services';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { ResourceRegistration } from '@/resources/resource-registrations';

export interface QuotaRow {
  resourceType: string;
  displayName: string;
  group: string;
  /** Reverse-DNS owner service, when known; drives entitlement visibility. */
  serviceName?: string;
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

/** Percentage of a bucket's limit that is allocated; 0 when there is no limit. */
export function calculateUsage(usage: { allocated: number; limit: number }) {
  const percentage = usage.limit > 0 ? Math.round((usage.allocated / usage.limit) * 100) : 0;
  return { used: usage.allocated, total: usage.limit, percentage };
}

export interface QuotaTableRow extends QuotaRow {
  bucket: AllowanceBucket;
  description?: string;
}

/**
 * Drop buckets whose owning service is entitlement-gated and not entitled in
 * this scope. Meant for route loaders, so hidden rows never reach the client.
 * Returns the input array untouched when entitlements are unknown (`null`).
 */
export function filterBucketsByEntitlement(
  buckets: AllowanceBucket[],
  registrations: Record<string, ResourceRegistration>,
  entitledServiceIds: ReadonlySet<string> | null
): AllowanceBucket[] {
  if (entitledServiceIds === null) return buckets;
  return buckets.filter((bucket) =>
    isServiceVisible(
      resolveServiceName(registrations[bucket.resourceType]?.service, bucket.resourceType),
      entitledServiceIds
    )
  );
}

/**
 * Join buckets to their registrations into table rows. Feature-flag
 * registrations carry no countable quota and are left out. The registration's
 * display name, description and owner drive the label, tooltip and grouping.
 */
export function buildQuotaRows(
  buckets: AllowanceBucket[],
  registrations: Record<string, ResourceRegistration>
): QuotaTableRow[] {
  return buckets
    .filter((bucket) => registrations[bucket.resourceType]?.type !== 'Feature')
    .map((bucket) => {
      const registration = registrations[bucket.resourceType];
      const { percentage } = calculateUsage(bucket.status ?? { allocated: 0, limit: 0 });
      return {
        resourceType: bucket.resourceType,
        displayName: resolveResourceDisplayName(registration?.displayName, bucket.resourceType),
        group: resolveServiceDisplayName(registration?.service, bucket.resourceType),
        serviceName: resolveServiceName(registration?.service, bucket.resourceType),
        percentage,
        description: registration?.description,
        bucket,
      };
    });
}
