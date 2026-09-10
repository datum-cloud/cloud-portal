import {
  buildProxyDnsDeletePreview,
  findZoneForHostname,
  type ProxyDnsDeletePreview,
  type ZoneRecords,
} from '@/features/edge/proxy/utils/delete-dns-preview';
import { createDnsRecordService, dnsRecordKeys } from '@/resources/dns-records';
import { useDnsZones } from '@/resources/dns-zones';
import type { HttpProxy } from '@/resources/http-proxies';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

export type UseProxyDnsPreviewResult = ProxyDnsDeletePreview & {
  /** Zone or record lookups are still in flight; rows may gain a type and value shortly. */
  isLoading: boolean;
  /** Every zone this proxy touches resolved, so record detail is complete. */
  isEnriched: boolean;
};

/**
 * DNS impact of deleting an Application Load Balancer, for the delete confirmation.
 *
 * A proxy's hostnames can span several DNS zones and records are only listable per
 * zone, so this resolves each hostname to its zone and fetches those zones' records.
 * Every lookup is best-effort: when the zone list or a record list is slow, denied, or
 * failing, the deleted rows still render from the proxy's own hostname conditions and
 * only the per-record type and value are missing.
 */
export function useProxyDnsDeletePreview(
  projectId: string,
  proxy: HttpProxy | undefined
): UseProxyDnsPreviewResult {
  const hostnames = useMemo(() => proxy?.hostnames ?? [], [proxy?.hostnames]);

  const { data: zones = [], isLoading: isLoadingZones } = useDnsZones(projectId, undefined, {
    staleTime: QUERY_STALE_TIME,
    retry: false,
    enabled: !!projectId && hostnames.length > 0,
  });

  // One entry per distinct zone the proxy's hostnames land in; a proxy with five
  // hostnames in one zone costs a single record list.
  const matchedZones = useMemo(() => {
    const byName = new Map<string, { name: string; domainName: string }>();
    for (const hostname of hostnames) {
      const zone = findZoneForHostname(zones, hostname);
      if (zone) byName.set(zone.name, { name: zone.name, domainName: zone.domainName });
    }
    return [...byName.values()];
  }, [zones, hostnames]);

  const recordQueries = useQueries({
    queries: matchedZones.map((zone) => ({
      queryKey: dnsRecordKeys.list(projectId, zone.name),
      queryFn: () => createDnsRecordService().list(projectId, zone.name),
      staleTime: QUERY_STALE_TIME,
      retry: false,
    })),
  });

  const zoneRecords = useMemo<ZoneRecords[]>(
    () =>
      matchedZones.flatMap((zone, index) => {
        const records = recordQueries[index]?.data;
        return records ? [{ zoneDomain: zone.domainName, records }] : [];
      }),
    [matchedZones, recordQueries]
  );

  const preview = useMemo(
    () =>
      proxy
        ? buildProxyDnsDeletePreview({ proxy, zoneRecords })
        : { hostnames: [], deleteCount: 0, keptCount: 0 },
    [proxy, zoneRecords]
  );

  return {
    ...preview,
    isLoading: isLoadingZones || recordQueries.some((query) => query.isLoading),
    isEnriched: !isLoadingZones && zoneRecords.length === matchedZones.length,
  };
}
