import { decomposeHostname, getUnverifiedHostnameError } from './hostname-verification';
import { describe, expect, test } from 'bun:test';

const verified = (domainName: string) => ({
  domainName,
  status: { conditions: [{ type: 'Ready', status: 'True' }] },
});
const unverified = (domainName: string) => ({
  domainName,
  status: { conditions: [{ type: 'Ready', status: 'False' }] },
});
const pending = (domainName: string) => ({ domainName, status: undefined });
const provenByDns = (domainName: string) => ({
  domainName,
  status: {
    conditions: [
      { type: 'Ready', status: 'True' },
      { type: 'Verified', status: 'True' },
      { type: 'VerifiedDNS', status: 'True' },
    ],
  },
});
const provenByHttp = (domainName: string) => ({
  domainName,
  status: {
    conditions: [
      { type: 'Ready', status: 'True' },
      { type: 'Verified', status: 'True' },
      { type: 'VerifiedHTTP', status: 'True' },
    ],
  },
});

describe('decomposeHostname', () => {
  test('matches the longest registered domain', () => {
    expect(
      decomposeHostname('api.staging.example.com', ['example.com', 'staging.example.com'])
    ).toEqual({ prefix: 'api', domain: 'staging.example.com' });
  });

  test('returns an empty prefix for the apex', () => {
    expect(decomposeHostname('example.com', ['example.com'])).toEqual({
      prefix: '',
      domain: 'example.com',
    });
  });

  test('does not match a domain that is only a suffix of a label', () => {
    expect(decomposeHostname('notexample.com', ['example.com'])).toBeNull();
  });
});

describe('getUnverifiedHostnameError', () => {
  test('allows a hostname under a verified domain', () => {
    expect(
      getUnverifiedHostnameError('api.example.com', [verified('example.com')])
    ).toBeUndefined();
  });

  test('allows the apex of a verified domain', () => {
    expect(getUnverifiedHostnameError('example.com', [verified('example.com')])).toBeUndefined();
  });

  test.each([
    ['unverified', unverified('example.com')],
    ['pending', pending('example.com')],
  ])('rejects a hostname under a %s domain', (_label, domain) => {
    expect(getUnverifiedHostnameError('api.example.com', [domain])).toBe(
      "example.com isn't verified yet. Verify it before adding hostnames."
    );
  });

  test('rejects a hostname outside every project domain', () => {
    expect(getUnverifiedHostnameError('api.other.dev', [verified('example.com')])).toBe(
      "api.other.dev isn't under a domain in this project. Add and verify its domain first."
    );
  });

  test('accepts a verified parent even when a closer domain is unverified', () => {
    expect(
      getUnverifiedHostnameError('api.staging.example.com', [
        verified('example.com'),
        unverified('staging.example.com'),
      ])
    ).toBeUndefined();
  });

  test('names the closest domain when none covering it is verified', () => {
    expect(
      getUnverifiedHostnameError('api.staging.example.com', [
        unverified('example.com'),
        pending('staging.example.com'),
      ])
    ).toBe("staging.example.com isn't verified yet. Verify it before adding hostnames.");
  });

  test('accepts a duplicate domain entry when one of them is verified', () => {
    expect(
      getUnverifiedHostnameError('api.example.com', [
        unverified('example.com'),
        verified('example.com'),
      ])
    ).toBeUndefined();
  });

  test('allows a wildcard under a domain proven by DNS', () => {
    expect(
      getUnverifiedHostnameError('*.s3.example.com', [provenByDns('example.com')])
    ).toBeUndefined();
  });

  test('allows a wildcard on the apex of a domain proven by DNS', () => {
    expect(
      getUnverifiedHostnameError('*.example.com', [provenByDns('example.com')])
    ).toBeUndefined();
  });

  test('rejects a wildcard whose domain was verified over HTTP', () => {
    expect(getUnverifiedHostnameError('*.s3.example.com', [provenByHttp('example.com')])).toBe(
      "Wildcards need example.com verified by its DNS TXT record. HTTP or Datum DNS zone verification doesn't count."
    );
  });
});
