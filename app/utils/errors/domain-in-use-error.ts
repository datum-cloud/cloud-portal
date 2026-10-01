import { AppError } from './app-error';

/**
 * The network-services-operator domain webhook refuses deletion with a 403
 * Forbidden whose message ends in "cannot delete Domain while in use by a DNSZone".
 * The HTTPProxy variant of that refusal is deliberately not matched here.
 */
const DNS_ZONE_IN_USE_PATTERN = /in use by a DNSZone/i;

export const DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE =
  "This domain can't be deleted while a DNS zone still uses it. Delete the zone first, then try again.";

const DELETE_FALLBACK_MESSAGE = 'Failed to delete domain';

export function isDomainInUseByDnsZoneError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const original = error instanceof AppError ? error.originalMessage : undefined;
  return [error.message, original].some((m) => !!m && DNS_ZONE_IN_USE_PATTERN.test(m));
}

/** Copy for a failed domain delete: the friendly in-use text, else the error's own message. */
export function formatDomainDeleteError(error: unknown): string {
  if (isDomainInUseByDnsZoneError(error)) return DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE;
  return (error instanceof Error && error.message) || DELETE_FALLBACK_MESSAGE;
}
