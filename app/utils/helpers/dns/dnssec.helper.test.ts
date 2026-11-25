import {
  buildDnssecRiskInput,
  getDnssecRisk,
  isDnssecOn,
  type DnssecRiskInput,
} from './dnssec.helper';
import type { DnsZone } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';
import { describe, expect, test } from 'vitest';

const DS = [{ keyTag: 1, algorithm: 13, digestType: 2, digest: 'ab' }];

function input(overrides: Partial<DnssecRiskInput> = {}): DnssecRiskInput {
  return {
    registration: { domain: 'example.com', dnssec: { enabled: true, ds: DS } },
    domainName: 'example.com',
    hasDnsZone: true,
    datumNameservers: ['ns1.datum.net', 'ns2.datum.net'],
    domainNameservers: ['ns1.other.com'],
    ...overrides,
  };
}

describe('getDnssecRisk', () => {
  test('returns parent for a subdomain', () => {
    const result = getDnssecRisk(
      input({
        domainName: 'claude-1570.example.com',
        registration: { domain: 'example.com', dnssec: { enabled: true, ds: DS } },
      })
    );
    expect(result).toBe('parent');
  });

  test('ignores case and trailing dot when matching the apex', () => {
    const result = getDnssecRisk(
      input({
        domainName: 'Example.com',
        registration: { domain: 'example.com.', dnssec: { enabled: true, ds: DS } },
      })
    );
    expect(result).not.toBe('parent');
  });

  test('treats a missing registration.domain as apex', () => {
    const result = getDnssecRisk(input({ registration: { dnssec: { enabled: true, ds: DS } } }));
    expect(result).not.toBe('parent');
  });

  test('returns unknown without registration', () => {
    expect(getDnssecRisk(input({ registration: undefined }))).toBe('unknown');
    expect(getDnssecRisk(input({ registration: null }))).toBe('unknown');
  });

  test('returns unknown when registration has no dnssec', () => {
    expect(getDnssecRisk(input({ registration: { domain: 'example.com' } }))).toBe('unknown');
  });

  test('returns off when dnssec is disabled', () => {
    const result = getDnssecRisk(
      input({ registration: { domain: 'example.com', dnssec: { enabled: false, ds: [] } } })
    );
    expect(result).toBe('off');
  });

  test('treats DS records without enabled as on', () => {
    const result = getDnssecRisk(
      input({ registration: { domain: 'example.com', dnssec: { ds: DS } }, hasDnsZone: false })
    );
    expect(result).toBe('on-not-hosted');
  });

  test('returns on-not-hosted when there is no zone', () => {
    expect(getDnssecRisk(input({ hasDnsZone: false, domainNameservers: [] }))).toBe(
      'on-not-hosted'
    );
  });

  test('returns on-before-switch when the domain uses other nameservers', () => {
    expect(getDnssecRisk(input())).toBe('on-before-switch');
  });

  test('returns on-before-switch when the zone has no assigned nameservers yet', () => {
    expect(getDnssecRisk(input({ datumNameservers: [] }))).toBe('on-before-switch');
  });

  test('returns on-broken when the domain uses both Datum nameservers', () => {
    const result = getDnssecRisk(input({ domainNameservers: ['ns1.datum.net', 'ns2.datum.net'] }));
    expect(result).toBe('on-broken');
  });

  test('returns on-broken on partial delegation', () => {
    const result = getDnssecRisk(input({ domainNameservers: ['ns1.datum.net', 'ns1.other.com'] }));
    expect(result).toBe('on-broken');
  });

  test('matches nameservers ignoring case and trailing dot', () => {
    const result = getDnssecRisk(
      input({ datumNameservers: ['ns1.datum.net'], domainNameservers: ['NS1.Datum.net.'] })
    );
    expect(result).toBe('on-broken');
  });
});

describe('isDnssecOn', () => {
  test('is true when enabled', () => {
    expect(isDnssecOn({ dnssec: { enabled: true } })).toBe(true);
  });

  test('is false when disabled', () => {
    expect(isDnssecOn({ dnssec: { enabled: false } })).toBe(false);
  });

  test('is null when unknown', () => {
    expect(isDnssecOn({ dnssec: {} })).toBeNull();
    expect(isDnssecOn({})).toBeNull();
    expect(isDnssecOn(null)).toBeNull();
  });
});

describe('buildDnssecRiskInput', () => {
  const registration = { domain: 'example.com', dnssec: { enabled: true, ds: DS } };

  test('without a zone, uses the domain name and reports no zone', () => {
    const result = buildDnssecRiskInput(
      { domainName: 'example.com', status: { registration } } as unknown as Domain,
      null
    );
    expect(result).toEqual({
      registration,
      domainName: 'example.com',
      hasDnsZone: false,
      datumNameservers: [],
      domainNameservers: [],
    });
  });

  test('with a zone, reads Datum nameservers and domain hostnames, skipping blanks', () => {
    const result = buildDnssecRiskInput(
      {
        domainName: 'example.com',
        status: { nameservers: [{ hostname: 'ns1.datum.net' }, {}], registration },
      } as unknown as Domain,
      { domainName: 'zone.example.com', status: { nameservers: ['ns1.datum.net'] } } as DnsZone
    );
    expect(result.hasDnsZone).toBe(true);
    expect(result.domainName).toBe('example.com');
    expect(result.datumNameservers).toEqual(['ns1.datum.net']);
    expect(result.domainNameservers).toEqual(['ns1.datum.net']);
  });

  test('without domain status, falls back to the zone name', () => {
    const result = buildDnssecRiskInput(
      {} as Domain,
      {
        domainName: 'zone.example.com',
      } as DnsZone
    );
    expect(result).toEqual({
      registration: undefined,
      domainName: 'zone.example.com',
      hasDnsZone: true,
      datumNameservers: [],
      domainNameservers: [],
    });
  });

  test('with nothing at all, uses an empty name', () => {
    expect(buildDnssecRiskInput(undefined, undefined).domainName).toBe('');
  });
});
