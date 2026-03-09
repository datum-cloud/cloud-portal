import {
  ELIGIBLE_PROTECT_RECORD_TYPES,
  isEligibleForProtect,
  isRowLocked,
  normalizeEndpoint,
  findProxyByEndpoint,
  findProxyForRecord,
} from '@/features/edge/dns-records/utils/proxy-match';
import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import type { HttpProxy } from '@/resources/http-proxies';

function mkRecord(overrides: Partial<IFlattenedDnsRecord> = {}): IFlattenedDnsRecord {
  return {
    dnsZoneId: 'zone-1',
    type: 'A',
    name: 'www',
    value: '192.0.2.1',
    rawData: {},
    ...overrides,
  };
}

function mkProxy(overrides: Partial<HttpProxy> = {}): HttpProxy {
  return {
    uid: 'proxy-1',
    name: 'proxy-1',
    namespace: 'default',
    resourceVersion: '1',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('proxy-match', () => {
  describe('ELIGIBLE_PROTECT_RECORD_TYPES', () => {
    it('includes A, AAAA, CNAME, ALIAS', () => {
      expect(ELIGIBLE_PROTECT_RECORD_TYPES).to.include('A');
      expect(ELIGIBLE_PROTECT_RECORD_TYPES).to.include('AAAA');
      expect(ELIGIBLE_PROTECT_RECORD_TYPES).to.include('CNAME');
      expect(ELIGIBLE_PROTECT_RECORD_TYPES).to.include('ALIAS');
    });
  });

  describe('isEligibleForProtect', () => {
    it('returns true for A, AAAA, CNAME, ALIAS', () => {
      expect(isEligibleForProtect('A')).to.equal(true);
      expect(isEligibleForProtect('AAAA')).to.equal(true);
      expect(isEligibleForProtect('CNAME')).to.equal(true);
      expect(isEligibleForProtect('ALIAS')).to.equal(true);
    });

    it('returns false for other record types', () => {
      expect(isEligibleForProtect('MX')).to.equal(false);
      expect(isEligibleForProtect('TXT')).to.equal(false);
      expect(isEligibleForProtect('NS')).to.equal(false);
      expect(isEligibleForProtect('SOA')).to.equal(false);
      expect(isEligibleForProtect('CAA')).to.equal(false);
    });
  });

  describe('isRowLocked', () => {
    it('returns true when lockReason is set', () => {
      expect(isRowLocked(mkRecord({ lockReason: 'Managed by AI Edge' }))).to.equal(true);
    });

    it('returns false when lockReason is undefined or empty', () => {
      expect(isRowLocked(mkRecord())).to.equal(false);
      expect(isRowLocked(mkRecord({ lockReason: '' }))).to.equal(false);
    });
  });

  describe('normalizeEndpoint', () => {
    it('lowercases the URL', () => {
      expect(normalizeEndpoint('HTTPS://Example.COM/')).to.equal('https://example.com');
    });

    it('trims whitespace', () => {
      expect(normalizeEndpoint('  https://api.example.com  ')).to.equal('https://api.example.com');
    });

    it('strips trailing slashes', () => {
      expect(normalizeEndpoint('https://api.example.com/')).to.equal('https://api.example.com');
      expect(normalizeEndpoint('https://api.example.com///')).to.equal('https://api.example.com');
    });

    it('empty or whitespace-only returns empty string', () => {
      expect(normalizeEndpoint('')).to.equal('');
      expect(normalizeEndpoint('   ')).to.equal('');
      expect(normalizeEndpoint('/')).to.equal('');
    });

    it('no trailing slash unchanged', () => {
      expect(normalizeEndpoint('https://api.example.com')).to.equal('https://api.example.com');
    });
  });

  describe('findProxyByEndpoint', () => {
    it('finds proxy when endpoint matches after normalization', () => {
      const p1 = mkProxy({ name: 'p1', endpoint: 'https://origin.example.com' });
      const p2 = mkProxy({ name: 'p2', endpoint: 'https://other.example.com' });
      expect(findProxyByEndpoint([p1, p2], 'https://origin.example.com')).to.equal(p1);
      expect(findProxyByEndpoint([p1, p2], '  HTTPS://ORIGIN.EXAMPLE.COM/  ')).to.equal(p1);
    });

    it('returns undefined when no proxy has matching endpoint', () => {
      const p1 = mkProxy({ name: 'p1', endpoint: 'https://a.example.com' });
      expect(findProxyByEndpoint([p1], 'https://b.example.com')).to.be.undefined;
    });

    it('returns undefined for empty endpoint', () => {
      const p1 = mkProxy({ name: 'p1', endpoint: 'https://a.example.com' });
      expect(findProxyByEndpoint([p1], '')).to.be.undefined;
      expect(findProxyByEndpoint([p1], '   ')).to.be.undefined;
    });

    it('ignores proxy with undefined endpoint', () => {
      const p1 = mkProxy({ name: 'p1', endpoint: undefined });
      expect(findProxyByEndpoint([p1], 'https://a.example.com')).to.be.undefined;
    });
  });

  describe('findProxyForRecord', () => {
    const alwaysEligible = () => true;
    const neverEligible = () => false;

    it('returns undefined when isEligibleForProtect returns false', () => {
      const record = mkRecord({ type: 'A', name: 'www', value: '192.0.2.1' });
      const proxies = [
        mkProxy({
          name: 'p1',
          endpoint: 'http://192.0.2.1',
          hostnames: ['www.example.com'],
        }),
      ];
      expect(findProxyForRecord(proxies, record, 'www.example.com', neverEligible)).to.be.undefined;
    });

    it('matches by hostname (case-insensitive) and endpoint', () => {
      const record = mkRecord({
        type: 'A',
        name: 'www',
        value: '192.0.2.1',
      });
      const p1 = mkProxy({
        name: 'p1',
        endpoint: 'http://192.0.2.1',
        hostnames: ['www.example.com'],
      });
      const proxies = [p1];
      expect(findProxyForRecord(proxies, record, 'www.example.com', alwaysEligible)).to.equal(p1);
      expect(findProxyForRecord(proxies, record, 'WWW.EXAMPLE.COM', alwaysEligible)).to.equal(p1);
    });

    it('hostname with trailing dot on proxy matches (normalized)', () => {
      const record = mkRecord({ type: 'CNAME', name: 'api', value: 'target.example.com.' });
      const p1 = mkProxy({
        name: 'p1',
        endpoint: 'https://target.example.com',
        hostnames: ['api.example.com.'], // trailing dot in API
      });
      const proxies = [p1];
      expect(findProxyForRecord(proxies, record, 'api.example.com', alwaysEligible)).to.equal(p1);
    });

    it('record value with trailing dot is stripped for endpoint', () => {
      const record = mkRecord({
        type: 'CNAME',
        name: 'api',
        value: 'origin.example.com.', // FQDN with trailing dot
      });
      const p1 = mkProxy({
        name: 'p1',
        endpoint: 'https://origin.example.com',
        hostnames: ['api.example.com'],
      });
      const proxies = [p1];
      expect(findProxyForRecord(proxies, record, 'api.example.com', alwaysEligible)).to.equal(p1);
    });

    it('A/AAAA use http:// for endpoint, others use https://', () => {
      const recordA = mkRecord({ type: 'A', name: 'www', value: '192.0.2.1' });
      const recordCname = mkRecord({ type: 'CNAME', name: 'www', value: 'backend.example.com' });
      const proxyHttp = mkProxy({
        name: 'p-http',
        endpoint: 'http://192.0.2.1',
        hostnames: ['www.example.com'],
      });
      const proxyHttps = mkProxy({
        name: 'p-https',
        endpoint: 'https://backend.example.com',
        hostnames: ['www.example.com'],
      });
      expect(
        findProxyForRecord([proxyHttp, proxyHttps], recordA, 'www.example.com', alwaysEligible)
      ).to.equal(proxyHttp);
      expect(
        findProxyForRecord([proxyHttp, proxyHttps], recordCname, 'www.example.com', alwaysEligible)
      ).to.equal(proxyHttps);
    });

    it('returns undefined when hostname does not match any proxy', () => {
      const record = mkRecord({ type: 'A', name: 'www', value: '192.0.2.1' });
      const p1 = mkProxy({
        name: 'p1',
        endpoint: 'http://192.0.2.1',
        hostnames: ['other.example.com'],
      });
      const proxies = [p1];
      expect(findProxyForRecord(proxies, record, 'www.example.com', alwaysEligible)).to.be
        .undefined;
    });

    it('returns undefined when record value is empty', () => {
      const record = mkRecord({ type: 'A', value: '' });
      const proxies = [
        mkProxy({ name: 'p1', endpoint: 'http://192.0.2.1', hostnames: ['www.example.com'] }),
      ];
      expect(findProxyForRecord(proxies, record, 'www.example.com', alwaysEligible)).to.be
        .undefined;
    });
  });
});
