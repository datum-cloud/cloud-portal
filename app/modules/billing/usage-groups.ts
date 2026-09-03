import { catalogServiceDisplayName } from '@/features/quotas/service-catalog';

/**
 * Reverse-DNS service domain that owns a meter, e.g.
 * `assistant.miloapis.com/conversation/input-tokens` → `assistant.miloapis.com`.
 *
 * The richer source would be the meter's first MonitoredResourceType →
 * `gvk.group`, but that catalog (`billing.miloapis.com/monitoredresourcetypes`)
 * is cluster-scoped and 403s through the end-user IAM proxy. The meter name
 * prefix resolves to the same service domain, so we derive the group from it
 * directly and avoid a guaranteed-failing round-trip.
 */
export function serviceDomainFromMeterName(meterName: string): string {
  const slash = meterName.indexOf('/');
  return slash > 0 ? meterName.slice(0, slash) : meterName;
}

/** `compute.miloapis.com` → `Compute`; `ai-gateway.x` → `Ai Gateway`. */
export function humanizeServiceGroup(domain: string): string {
  const label = domain.split('.')[0] ?? domain;
  return label
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Group id and title for a meter. Catalog display names win so acronyms
 * like DNS stay DNS instead of title-casing to Dns.
 */
export function resolveMeterGroup(meterName: string): { id: string; title: string } {
  const domain = serviceDomainFromMeterName(meterName);
  return {
    id: domain,
    title: catalogServiceDisplayName(domain) ?? humanizeServiceGroup(domain),
  };
}
