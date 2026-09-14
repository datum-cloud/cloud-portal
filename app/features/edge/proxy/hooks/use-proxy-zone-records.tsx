import {
  findZoneForHostname,
  type ZoneRecords,
} from '@/features/edge/proxy/utils/delete-dns-preview';
import { createDnsRecordService, dnsRecordKeys, useDnsRecordsWatch } from '@/resources/dns-records';
import { useDnsZones } from '@/resources/dns-zones';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

export type MatchedDnsZone = { name: string; domainName: string };

export function useProxyZoneRecords(
  projectId: string | undefined,
  hostnames: string[],
  options?: { refetchInterval?: number | false | (() => number | false) }
) {
  const { data: zones = [], isLoading: isLoadingZones } = useDnsZones(projectId ?? '', undefined, {
    staleTime: QUERY_STALE_TIME,
    retry: false,
    enabled: !!projectId && hostnames.length > 0,
  });

  // One list per distinct zone the hostnames land in; five hostnames in one
  // zone still cost a single records fetch.
  const matchedZones = useMemo<MatchedDnsZone[]>(() => {
    const byName = new Map<string, MatchedDnsZone>();
    for (const hostname of hostnames) {
      const zone = findZoneForHostname(zones, hostname);
      if (zone) byName.set(zone.name, { name: zone.name, domainName: zone.domainName });
    }
    return [...byName.values()];
  }, [zones, hostnames]);

  const recordQueries = useQueries({
    queries: matchedZones.map((zone) => ({
      queryKey: dnsRecordKeys.list(projectId ?? '', zone.name),
      queryFn: () => createDnsRecordService().list(projectId!, zone.name),
      staleTime: QUERY_STALE_TIME,
      retry: false,
      enabled: !!projectId,
      refetchInterval: options?.refetchInterval,
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

  return {
    zones,
    matchedZones,
    zoneRecords,
    isLoading: isLoadingZones || recordQueries.some((query) => query.isLoading),
  };
}

/** Watch each matched zone so hostname DNS conflict chips update without a reload. */
export function ProxyZoneRecordsWatch({
  projectId,
  zoneIds,
}: {
  projectId: string;
  zoneIds: string[];
}) {
  return (
    <>
      {zoneIds.map((zoneId) => (
        <ZoneRecordsWatch key={zoneId} projectId={projectId} zoneId={zoneId} />
      ))}
    </>
  );
}

function ZoneRecordsWatch({ projectId, zoneId }: { projectId: string; zoneId: string }) {
  useDnsRecordsWatch(projectId, zoneId, { enabled: !!projectId && !!zoneId });
  return null;
}
