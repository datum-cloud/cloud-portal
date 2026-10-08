import { coversHostname, findCoveringDomain } from '@/features/edge/proxy/utils/covering-domain';
import { ControlPlaneStatus } from '@/resources/base';
import type { Domain } from '@/resources/domains';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

export function isDomainVerified(domain: Pick<Domain, 'status'>): boolean {
  return transformControlPlaneStatus(domain.status).status === ControlPlaneStatus.Success;
}

const hasTrueCondition = (domain: Pick<Domain, 'status'>, type: string): boolean =>
  domain.status?.conditions?.some(
    (condition: { type: string; status: string }) =>
      condition.type === type && condition.status === 'True'
  ) ?? false;

/**
 * Verified by its DNS TXT record. Wildcards accept only this proof: HTTP and
 * Datum DNS zone verification don't count.
 */
function isDomainProvenByDns(domain: Pick<Domain, 'status'>): boolean {
  return hasTrueCondition(domain, 'Verified') && hasTrueCondition(domain, 'VerifiedDNS');
}

/**
 * Decompose a full hostname into prefix + parent domain.
 * Returns the longest matching registered domain.
 */
export function decomposeHostname(
  hostname: string,
  domainNames: string[]
): { prefix: string; domain: string } | null {
  if (!hostname) return null;
  const lower = hostname.toLowerCase();
  const sorted = [...domainNames].sort((a, b) => b.length - a.length);

  for (const domain of sorted) {
    const domainLower = domain.toLowerCase();
    if (lower === domainLower) {
      return { prefix: '', domain };
    }
    if (lower.endsWith(`.${domainLower}`)) {
      const prefix = lower.slice(0, -(domainLower.length + 1));
      return { prefix, domain };
    }
  }
  return null;
}

/**
 * Why a hostname can't be added to an ALB, or undefined if it can.
 *
 * An ALB hostname only goes live once a Domain covering it is verified. Until
 * then the proxy sits in Programming and eventually errors, so new hostnames
 * must sit under a verified domain in the project.
 *
 * Mirrors the gateway controller in network-services-operator: any verified
 * Domain that equals the hostname or is a parent of it counts, not only the
 * closest one. A wildcard is judged by its base and needs that Domain proven
 * by DNS.
 */
export function getUnverifiedHostnameError(
  hostname: string,
  domains: Pick<Domain, 'domainName' | 'status'>[]
): string | undefined {
  const covering = domains.filter((d) => coversHostname(d.domainName, hostname));
  if (covering.length === 0) {
    return `${hostname} isn't under a domain in this project. Add and verify its domain first.`;
  }
  const closest = findCoveringDomain(covering, hostname)!.domainName;
  if (hostname.trim().startsWith('*.')) {
    if (covering.some(isDomainProvenByDns)) return undefined;
    return `Wildcards need ${closest} verified by its DNS TXT record. HTTP or Datum DNS zone verification doesn't count.`;
  }
  if (covering.some(isDomainVerified)) return undefined;
  return `${closest} isn't verified yet. Verify it before adding hostnames.`;
}
