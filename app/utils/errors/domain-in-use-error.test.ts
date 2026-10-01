import { AppError } from './app-error';
import {
  DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE,
  formatDomainDeleteError,
  isDomainInUseByDnsZoneError,
} from './domain-in-use-error';
import { describe, expect, test } from 'bun:test';

// What the client interceptor builds from the operator webhook's 403 Forbidden Status.
const inUseError = new AppError('Cannot delete Domain while in use by a DNSZone', {
  code: 'AUTHORIZATION_ERROR',
  status: 403,
  originalMessage:
    'domains.networking.datumapis.com "example-com" is forbidden: cannot delete Domain while in use by a DNSZone',
});

describe('isDomainInUseByDnsZoneError', () => {
  test('matches the DNSZone in-use refusal', () => {
    expect(isDomainInUseByDnsZoneError(inUseError)).toBe(true);
    expect(
      isDomainInUseByDnsZoneError(new Error('cannot delete domain while in use by a dnszone'))
    ).toBe(true);
  });

  test('ignores unrelated errors', () => {
    expect(isDomainInUseByDnsZoneError(new Error('Network error or server unavailable'))).toBe(
      false
    );
    expect(
      isDomainInUseByDnsZoneError(new Error('Cannot delete Domain while in use by an HTTPProxy'))
    ).toBe(false);
    expect(isDomainInUseByDnsZoneError(undefined)).toBe(false);
    expect(isDomainInUseByDnsZoneError('in use by a DNSZone')).toBe(false);
  });
});

describe('formatDomainDeleteError', () => {
  test('returns the friendly copy for the in-use refusal', () => {
    expect(formatDomainDeleteError(inUseError)).toBe(DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE);
    expect(DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE).toBe(
      "This domain can't be deleted while a DNS zone still uses it. Delete the zone first, then try again."
    );
  });

  test('passes other messages through and falls back when there is none', () => {
    expect(formatDomainDeleteError(new Error('Something broke'))).toBe('Something broke');
    expect(formatDomainDeleteError(new Error(''))).toBe('Failed to delete domain');
    expect(formatDomainDeleteError(null)).toBe('Failed to delete domain');
  });
});
