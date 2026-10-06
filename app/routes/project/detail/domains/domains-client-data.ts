import type { DnsZone } from '@/resources/dns-zones';
import { dnsZoneKeys } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';
import { domainKeys } from '@/resources/domains';
import { readValidCachedQueryData } from '@/utils/helpers/project-list-client-loader';
import type { QueryClient } from '@tanstack/react-query';

export type DomainsListData = { domains: Domain[]; dnsZones: DnsZone[] };

/**
 * Both lists must be validly cached: a defaulted empty zone list would show
 * every domain as having no zone. Undefined falls through to the server loader.
 */
export function readDomainsClientData(
  qc: QueryClient,
  projectId: string
): DomainsListData | undefined {
  const domains = readValidCachedQueryData<Domain[]>(qc, domainKeys.list(projectId));
  const dnsZones = readValidCachedQueryData<DnsZone[]>(qc, dnsZoneKeys.list(projectId));
  if (domains === undefined || dnsZones === undefined) return undefined;
  return { domains, dnsZones };
}
