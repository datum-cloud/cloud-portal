import { useProxyZoneRecords } from '@/features/edge/proxy/hooks/use-proxy-zone-records';
import {
  buildProxyDnsDeletePreview,
  type ProxyDnsDeletePreview,
} from '@/features/edge/proxy/utils/delete-dns-preview';
import type { HttpProxy } from '@/resources/http-proxies';
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
  const { matchedZones, zoneRecords, isLoading } = useProxyZoneRecords(projectId, hostnames);

  const preview = useMemo(
    () =>
      proxy
        ? buildProxyDnsDeletePreview({ proxy, zoneRecords })
        : { hostnames: [], deleteCount: 0, keptCount: 0 },
    [proxy, zoneRecords]
  );

  return {
    ...preview,
    isLoading,
    isEnriched: !isLoading && zoneRecords.length === matchedZones.length,
  };
}
