import { IDnsNameserver } from './domain.schema';

/**
 * Extract the unique DNS host *provider* names (registrant names) from a
 * domain's nameservers — the same value the "DNS Host" table column shows.
 * Accepts either the full nameservers array or a bare ips array.
 */
export function getDnsHostProviders(
  data: IDnsNameserver[] | IDnsNameserver['ips'] | undefined
): string[] {
  if (!data?.length) return [];

  const isNameservers = (d: typeof data): d is IDnsNameserver[] =>
    Array.isArray(d) && d.length > 0 && 'hostname' in d[0];

  const names = new Set<string>();
  const collect = (ips: IDnsNameserver['ips'] | undefined) => {
    ips?.forEach((ip) => {
      const name = ip?.registrantName?.trim();
      if (name) names.add(name);
    });
  };

  if (isNameservers(data)) {
    data.forEach((ns) => collect(ns?.ips));
  } else {
    collect(data);
  }

  return Array.from(names);
}
