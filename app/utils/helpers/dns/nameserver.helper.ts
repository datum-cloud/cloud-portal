import { getDnsZoneErrorState } from './dns-zone-error.helper';
import type { DnsZone } from '@/resources/dns-zones';
import { IDnsNameserver } from '@/resources/domains';

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
 * @param dnsZone - The DNS zone containing status and nameserver info
 * @returns Setup status object with counts and boolean flags
 */
export function getNameserverSetupStatus(dnsZone?: DnsZone): INameserverSetupStatus {
  const datumNs = dnsZone?.status?.nameservers ?? [];
  const zoneNs =
    dnsZone?.status?.domainRef?.status?.nameservers?.map((ns: IDnsNameserver) => ns.hostname) ?? [];

  // Normalize for comparison:
  // - case-insensitive (DNS is case-insensitive per RFC 1035)
  // - ignore a single trailing dot on FQDNs
  const normalizeNs = (ns?: string) => (ns ?? '').trim().toLowerCase().replace(/\.$/, '');
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

export interface IDnsZoneDelegationState {
  /**
   * True when the zone is healthy but the domain's nameservers do not yet point
   * at Datum, so records in the zone stay in "Validating" until the operator
   * acts at their registrar.
   */
  isPending: boolean;
  /** Datum nameservers the operator must configure. Empty while Datum is still assigning them. */
  datumNameservers: string[];
  setup: INameserverSetupStatus;
}

/**
 * Decide whether a DNS zone is waiting on the operator to delegate nameservers.
 *
 * This is the "nothing is wrong, but nothing will work until you act" state
 * that the error banner deliberately ignores. It is pending only when:
 * - the zone is not errored (errors have their own banner),
 * - the zone is backed by a domain and the domain's current nameservers have
 *   been looked up (an unknown list is "still looking up", not "wrong"),
 * - Datum has assigned nameservers to the zone, and
 * - not every Datum nameserver appears in the domain's current list.
 *
 * Callers that already ran the zone through `transformControlPlaneStatus`
 * (the list page does, per row) can pass `hasError` to skip a second pass.
 */
export function getDnsZoneDelegationState(
  dnsZone?: DnsZone | null,
  options?: { hasError?: boolean }
): IDnsZoneDelegationState {
  const setup = getNameserverSetupStatus(dnsZone ?? undefined);
  const datumNameservers: string[] = dnsZone?.status?.nameservers ?? [];
  const hasError = options?.hasError ?? (dnsZone ? getDnsZoneErrorState(dnsZone).hasError : false);

  if (!dnsZone || hasError) {
    return { isPending: false, datumNameservers, setup };
  }

  const hasDomain = !!dnsZone.status?.domainRef?.name;
  const domainNameserversKnown = Array.isArray(dnsZone.status?.domainRef?.status?.nameservers);

  const isPending =
    hasDomain && domainNameserversKnown && datumNameservers.length > 0 && !setup.isFullySetup;

  return { isPending, datumNameservers, setup };
}
