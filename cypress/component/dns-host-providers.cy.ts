import { getDnsHostProviders } from '@/resources/domains';

describe('getDnsHostProviders', () => {
  it('returns [] for undefined or empty', () => {
    expect(getDnsHostProviders(undefined)).to.deep.equal([]);
    expect(getDnsHostProviders([])).to.deep.equal([]);
  });
  it('extracts unique registrant names from nameserver ips', () => {
    const ns = [
      { hostname: 'ns1.example.com', ips: [{ registrantName: 'Cloudflare' }] },
      { hostname: 'ns2.example.com', ips: [{ registrantName: 'Cloudflare' }] },
    ] as never;
    expect(getDnsHostProviders(ns)).to.deep.equal(['Cloudflare']);
  });
  it('trims and skips blank registrant names', () => {
    const ns = [
      { hostname: 'ns1', ips: [{ registrantName: '  Akamai  ' }, { registrantName: '' }] },
    ] as never;
    expect(getDnsHostProviders(ns)).to.deep.equal(['Akamai']);
  });
  it('accepts a bare ips array (no hostname key)', () => {
    const ips = [{ registrantName: 'Akamai' }, { registrantName: 'Akamai' }] as never;
    expect(getDnsHostProviders(ips)).to.deep.equal(['Akamai']);
  });
});
