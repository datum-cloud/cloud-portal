import { getDnsHostProviders } from './nameserver.helper';
import { describe, expect, it } from 'bun:test';

describe('getDnsHostProviders', () => {
  it('returns [] for undefined or empty', () => {
    expect(getDnsHostProviders(undefined)).toEqual([]);
    expect(getDnsHostProviders([])).toEqual([]);
  });
  it('extracts unique registrant names from nameserver ips', () => {
    const ns = [
      { hostname: 'ns1.example.com', ips: [{ registrantName: 'Cloudflare' }] },
      { hostname: 'ns2.example.com', ips: [{ registrantName: 'Cloudflare' }] },
    ] as never;
    expect(getDnsHostProviders(ns)).toEqual(['Cloudflare']);
  });
  it('trims and skips blank registrant names', () => {
    const ns = [
      { hostname: 'ns1', ips: [{ registrantName: '  Akamai  ' }, { registrantName: '' }] },
    ] as never;
    expect(getDnsHostProviders(ns)).toEqual(['Akamai']);
  });
  it('accepts a bare ips array (no hostname key)', () => {
    const ips = [{ registrantName: 'Akamai' }, { registrantName: 'Akamai' }] as never;
    expect(getDnsHostProviders(ips)).toEqual(['Akamai']);
  });
});
