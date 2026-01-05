import { IDnsNameserver, IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';

// =============================================================================
// Nameserver Setup Helpers
// =============================================================================

export interface INameserverSetupStatus {
  isFullySetup: boolean;
  isPartiallySetup: boolean;
  hasAnySetup: boolean;
  setupCount: number;
  totalCount: number;
}

/**
 * Analyze nameserver setup status by comparing Datum nameservers with configured zone nameservers
 *
 * @param dnsZone - The DNS zone control response containing status and nameserver info
 * @returns Setup status object with counts and boolean flags
 */
export function getNameserverSetupStatus(
  dnsZone?: IDnsZoneControlResponse
): INameserverSetupStatus {
  const datumNs = dnsZone?.status?.nameservers ?? [];
  const zoneNs =
    dnsZone?.status?.domainRef?.status?.nameservers?.map((ns: IDnsNameserver) => ns.hostname) ?? [];

  // Normalize for comparison:
  // - case-insensitive (DNS is case-insensitive per RFC 1035)
  // - ignore a single trailing dot on FQDNs
  const normalizeNs = (ns?: string) =>
    (ns ?? '')
      .trim()
      .toLowerCase()
      .replace(/\.$/, '');
  const zoneNsNormalized = zoneNs.map(normalizeNs);
  const datumNsNormalized = datumNs.map(normalizeNs);
  const setupCount = datumNsNormalized.filter((ns: string) => zoneNsNormalized.includes(ns)).length;
  const totalCount = datumNs.length;

  return {
    isFullySetup: setupCount === totalCount && totalCount > 0,
    isPartiallySetup: setupCount > 0 && setupCount < totalCount,
    hasAnySetup: setupCount > 0,
    setupCount,
    totalCount,
  };
}
