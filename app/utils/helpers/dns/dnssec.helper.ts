import type { DnsZone } from '@/resources/dns-zones';
import type { Domain, DomainRegistration } from '@/resources/domains';

// =============================================================================
// DNSSEC Risk Helpers
// =============================================================================

export type DnssecRisk =
  'unknown' | 'off' | 'parent' | 'on-not-hosted' | 'on-before-switch' | 'on-broken';

export interface DnssecRiskInput {
  registration?: DomainRegistration | null;
  /** domain.domainName (spec.domainName), e.g. shop.example.com */
  domainName: string;
  /** A Datum DNS zone exists for this domain */
  hasDnsZone: boolean;
  /** dnsZone.status.nameservers (hostnames); [] when none */
  datumNameservers: string[];
  /** domain.status.nameservers[].hostname (live) */
  domainNameservers: string[];
}

// Same rule as getNameserverSetupStatus: case-insensitive, one trailing dot ignored.
function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

/**
 * Whether DNSSEC is on for the registered domain.
 * On = at least one DS record, or `enabled` is true. Returns null when unknown.
 */
export function isDnssecOn(registration?: DomainRegistration | null): boolean | null {
  const dnssec = registration?.dnssec;
  if (!dnssec) return null;
  if ((dnssec.ds?.length ?? 0) > 0 || dnssec.enabled === true) return true;
  return dnssec.enabled === false ? false : null;
}

function isSubdomain(registration: DomainRegistration, domainName: string): boolean {
  if (!registration.domain) return false;
  return normalizeHostname(registration.domain) !== normalizeHostname(domainName);
}

function usesDatumNameservers(datumNameservers: string[], domainNameservers: string[]): boolean {
  const datum = new Set(datumNameservers.map(normalizeHostname));
  return domainNameservers.some((ns) => datum.has(normalizeHostname(ns)));
}

/**
 * Decide how DNSSEC puts a domain at risk when it is hosted (or about to be hosted) on Datum.
 * Never reads `status.apex`: the backend omits it when false.
 */
export function getDnssecRisk(input: DnssecRiskInput): DnssecRisk {
  const { registration, domainName, hasDnsZone, datumNameservers, domainNameservers } = input;

  if (registration && isSubdomain(registration, domainName)) return 'parent';

  const on = isDnssecOn(registration);
  if (on === null) return 'unknown';
  if (!on) return 'off';
  if (!hasDnsZone) return 'on-not-hosted';

  return usesDatumNameservers(datumNameservers, domainNameservers)
    ? 'on-broken'
    : 'on-before-switch';
}

/**
 * Build the getDnssecRisk input from a domain and its (optional) DNS zone.
 * The domain name comes from the domain, then the zone, then ''.
 */
export function buildDnssecRiskInput(
  domain: Domain | undefined,
  dnsZone: DnsZone | null | undefined
): DnssecRiskInput {
  return {
    registration: domain?.status?.registration,
    domainName: domain?.domainName ?? dnsZone?.domainName ?? '',
    hasDnsZone: !!dnsZone,
    datumNameservers: dnsZone?.status?.nameservers ?? [],
    domainNameservers: (domain?.status?.nameservers ?? [])
      .map((ns: { hostname?: string }) => ns.hostname)
      .filter((hostname?: string): hostname is string => !!hostname),
  };
}
