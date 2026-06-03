import { DOMAIN_CSV_HEADERS, domainToCsvRow } from '@/features/edge/domain/export';
import type { Domain } from '@/resources/domains';

const base = (overrides: Partial<Domain> = {}): Domain =>
  ({ name: 'example-com', domainName: 'example.com', status: {}, ...overrides }) as Domain;

describe('domainToCsvRow', () => {
  it('uses snake_case header tokens in column order', () => {
    expect(DOMAIN_CSV_HEADERS).to.deep.equal([
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
    expect(domainToCsvRow(d)).to.deep.equal([
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
    expect(domainToCsvRow(d)[1]).to.equal('Private');
  });

  it('leaves registrar blank when there is no registration', () => {
    const d = base({ status: {} } as never);
    expect(domainToCsvRow(d)[1]).to.equal('');
  });

  it('renders Unverified and blank expiration/DNS when data is missing', () => {
    const d = base({ status: { verified: false } } as never);
    const row = domainToCsvRow(d);
    expect(row[2]).to.equal(''); // DNS host
    expect(row[3]).to.equal(''); // Expiration date
    expect(row[4]).to.equal('Unverified');
  });
});
