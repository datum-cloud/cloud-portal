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

/**
 * Why a healthy zone is not serving traffic yet.
 * - `domainVerification`: the platform withholds nameservers until the operator
 *   proves they own the domain (zone condition `Accepted=False`,
 *   reason `PendingDomainVerification`). The fix lives on the domain page.
 * - `nameserverDelegation`: Datum assigned nameservers but the domain still
 *   points elsewhere. The fix lives at the registrar.
 */
export type DnsZoneActivationReason = 'domainVerification' | 'nameserverDelegation';

const PENDING_DOMAIN_VERIFICATION_REASON = 'pendingdomainverification';

export interface IDnsZoneDelegationState {
  /**
   * True when the zone is healthy but nothing will resolve through Datum until
   * the operator acts: records stay in "Validating" until `reason` is dealt with.
   */
  isPending: boolean;
  reason: DnsZoneActivationReason | null;
  /** Resource name of the backing domain, for linking to its verification page. */
  domainName: string | null;
  /** Datum nameservers the operator must configure. Empty while Datum is still assigning them. */
  datumNameservers: string[];
  setup: INameserverSetupStatus;
}

function isPendingDomainVerification(dnsZone: DnsZone): boolean {
  const conditions: { type?: string; status?: string; reason?: string }[] =
    dnsZone.status?.conditions ?? [];
  return conditions.some(
    (c) =>
      c.type === 'Accepted' &&
      c.status === 'False' &&
      (c.reason ?? '').toLowerCase() === PENDING_DOMAIN_VERIFICATION_REASON
  );
}

/**
 * Decide whether a DNS zone is waiting on the operator before it can go live.
 *
 * This is the "nothing is wrong, but nothing will work until you act" state
 * that the error banner deliberately ignores. It is pending only when the
 * zone is not errored (errors have their own banner) and is backed by a
 * domain, and then either:
 * - the platform is waiting on domain ownership verification, or
 * - Datum has assigned nameservers, the domain's current nameservers have
 *   been looked up (an unknown list is "still looking up", not "wrong"), and
 *   not every Datum nameserver appears in that list.
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
  const domainName: string | null = dnsZone?.status?.domainRef?.name ?? null;
  const hasError = options?.hasError ?? (dnsZone ? getDnsZoneErrorState(dnsZone).hasError : false);
  const idle: IDnsZoneDelegationState = {
    isPending: false,
    reason: null,
    domainName,
    datumNameservers,
    setup,
  };

  if (!dnsZone || hasError || !domainName) {
    return idle;
  }

  if (isPendingDomainVerification(dnsZone)) {
    return { ...idle, isPending: true, reason: 'domainVerification' };
  }

  const domainNameserversKnown = Array.isArray(dnsZone.status?.domainRef?.status?.nameservers);
  if (domainNameserversKnown && datumNameservers.length > 0 && !setup.isFullySetup) {
    return { ...idle, isPending: true, reason: 'nameserverDelegation' };
  }

  return idle;
}
