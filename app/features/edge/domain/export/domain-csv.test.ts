import { DOMAIN_CSV_HEADERS, domainToCsvRow } from './domain-csv';
import type { Domain } from '@/resources/domains';
import { describe, expect, it } from 'bun:test';

const base = (overrides: Partial<Domain> = {}): Domain =>
  ({ name: 'example-com', domainName: 'example.com', status: {}, ...overrides }) as Domain;

describe('domainToCsvRow', () => {
  it('uses snake_case header tokens in column order', () => {
    expect(DOMAIN_CSV_HEADERS).toEqual([
      'domain',
      'registrar',
      'dns_host',
      'expiration_date',
      'verification_status',
      'resource_name',
    ]);
  });

  it('maps a fully-populated verified domain', () => {
    const d = base({
      status: {
        verified: true,
        nameservers: [{ hostname: 'ns1', ips: [{ registrantName: 'Cloudflare' }] }],
        registration: { registrar: { name: 'GoDaddy' }, expiresAt: '2027-03-15T00:00:00Z' },
      },
    } as never);
    expect(domainToCsvRow(d)).toEqual([
      'example.com',
      'GoDaddy',
      'Cloudflare',
      '2027-03-15',
      'Verified',
      'example-com',
    ]);
  });

  it('uses "Private" when registration exists but the registrar name is hidden', () => {
    const d = base({ status: { registration: {} } } as never);
    expect(domainToCsvRow(d)[1]).toBe('Private');
  });

  it('leaves registrar blank when there is no registration', () => {
    const d = base({ status: {} } as never);
    expect(domainToCsvRow(d)[1]).toBe('');
  });

  it('renders Unverified and blank expiration/DNS when data is missing', () => {
    const d = base({ status: { verified: false } } as never);
    const row = domainToCsvRow(d);
    expect(row[2]).toBe(''); // DNS host
    expect(row[3]).toBe(''); // Expiration date
    expect(row[4]).toBe('Unverified');
  });
});
