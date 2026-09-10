import {
  buildProxyDnsDeletePreview,
  findZoneForHostname,
  type ZoneRecords,
} from './delete-dns-preview';
import type { IFlattenedDnsRecord } from '@/resources/dns-records';
import type { HttpProxy } from '@/resources/http-proxies';
import { describe, expect, it } from 'bun:test';

const zone = (domainName: string) => ({ name: domainName.replace(/\./g, '-'), domainName });

/** Minimal proxy stub; only the fields the preview reads are populated. */
function makeProxy(overrides: Partial<HttpProxy> = {}): HttpProxy {
  return {
    name: 'edge-proxy',
    hostnames: [],
    hostnameStatuses: [],
    ...overrides,
  } as HttpProxy;
}

/** Condition entry shaped like the operator's per-hostname DNSRecordProgrammed. */
function dnsStatus(hostname: string, status: 'True' | 'False' | 'Unknown', reason: string) {
  return {
    hostname,
    conditions: [
      {
        type: 'DNSRecordProgrammed',
        status,
        reason,
        message: '',
        lastTransitionTime: '2026-09-10T00:00:00Z',
      },
    ],
  };
}

function makeRecord(overrides: Partial<IFlattenedDnsRecord> = {}): IFlattenedDnsRecord {
  return {
    dnsZoneId: 'example-com',
    type: 'CNAME',
    name: 'api',
    value: 'edge.datum.net.',
    rawData: {},
    ...overrides,
  } as IFlattenedDnsRecord;
}

describe('findZoneForHostname', () => {
  it('returns undefined when no zone covers the hostname', () => {
    expect(findZoneForHostname([zone('example.com')], 'api.other.com')).toBeUndefined();
  });

  it('matches the apex zone for a subdomain hostname', () => {
    expect(findZoneForHostname([zone('example.com')], 'api.example.com')?.domainName).toBe(
      'example.com'
    );
  });

  it('matches the zone for the apex hostname itself', () => {
    expect(findZoneForHostname([zone('example.com')], 'example.com')?.domainName).toBe(
      'example.com'
    );
  });

  it('prefers the most specific zone when nested zones both match', () => {
    const zones = [zone('example.com'), zone('api.example.com')];
    expect(findZoneForHostname(zones, 'v1.api.example.com')?.domainName).toBe('api.example.com');
  });

  it('ignores case and trailing dots on both sides', () => {
    expect(findZoneForHostname([zone('Example.com.')], 'API.example.com.')?.domainName).toBe(
      'Example.com.'
    );
  });

  it('does not treat a partial label suffix as a match', () => {
    expect(findZoneForHostname([zone('example.com')], 'notexample.com')).toBeUndefined();
  });
});

describe('buildProxyDnsDeletePreview — Datum-managed records', () => {
  it('returns one entry per hostname, in the proxy hostname order', () => {
    const proxy = makeProxy({ hostnames: ['b.example.com', 'a.example.com'] });
    const { hostnames } = buildProxyDnsDeletePreview({ proxy, zoneRecords: [] });
    expect(hostnames.map((h) => h.hostname)).toEqual(['b.example.com', 'a.example.com']);
  });

  it('marks a programmed hostname as will-delete and counts it', () => {
    const proxy = makeProxy({
      hostnames: ['api.example.com'],
      hostnameStatuses: [dnsStatus('api.example.com', 'True', 'DNSRecordCreated')],
    });
    const preview = buildProxyDnsDeletePreview({ proxy, zoneRecords: [] });
    expect(preview.hostnames[0].datumRecord.state).toBe('will-delete');
    expect(preview.deleteCount).toBe(1);
  });

  it('marks a NotApplicable hostname as no-record and excludes it from the count', () => {
    const proxy = makeProxy({
      hostnames: ['api.other.com'],
      hostnameStatuses: [dnsStatus('api.other.com', 'False', 'NotApplicable')],
    });
    const preview = buildProxyDnsDeletePreview({ proxy, zoneRecords: [] });
    expect(preview.hostnames[0].datumRecord.state).toBe('no-record');
    expect(preview.deleteCount).toBe(0);
  });

  it.each([['DomainNotVerified'], ['DNSAuthorityMissing'], ['Conflict'], ['Failed']])(
    'marks reason %s as pending because Datum programmed no record',
    (reason) => {
      const proxy = makeProxy({
        hostnames: ['api.example.com'],
        hostnameStatuses: [dnsStatus('api.example.com', 'False', reason)],
      });
      const preview = buildProxyDnsDeletePreview({ proxy, zoneRecords: [] });
      expect(preview.hostnames[0].datumRecord.state).toBe('pending');
      expect(preview.deleteCount).toBe(0);
    }
  );

  it('marks a hostname with no status entry as pending', () => {
    const proxy = makeProxy({ hostnames: ['api.example.com'] });
    const { hostnames } = buildProxyDnsDeletePreview({ proxy, zoneRecords: [] });
    expect(hostnames[0].datumRecord.state).toBe('pending');
  });

  it('enriches a will-delete entry with the gateway-owned record type and value', () => {
    const proxy = makeProxy({
      hostnames: ['api.example.com'],
      hostnameStatuses: [dnsStatus('api.example.com', 'True', 'DNSRecordCreated')],
    });
    const zoneRecords: ZoneRecords[] = [
      {
        zoneDomain: 'example.com',
        records: [
          makeRecord({ managedByGateway: true, gatewaySourceName: 'edge-proxy', name: 'api' }),
        ],
      },
    ];
    const { hostnames } = buildProxyDnsDeletePreview({ proxy, zoneRecords });
    expect(hostnames[0].datumRecord).toMatchObject({ type: 'CNAME', value: 'edge.datum.net.' });
  });

  it('resolves an apex record written as @ against the zone domain', () => {
    const proxy = makeProxy({
      hostnames: ['example.com'],
      hostnameStatuses: [dnsStatus('example.com', 'True', 'DNSRecordCreated')],
    });
    const zoneRecords: ZoneRecords[] = [
      {
        zoneDomain: 'example.com',
        records: [
          makeRecord({
            managedByGateway: true,
            gatewaySourceName: 'edge-proxy',
            name: '@',
            type: 'ALIAS',
          }),
        ],
      },
    ];
    const { hostnames } = buildProxyDnsDeletePreview({ proxy, zoneRecords });
    expect(hostnames[0].datumRecord.type).toBe('ALIAS');
  });

  it('still reports will-delete, without detail, when records are not loaded', () => {
    const proxy = makeProxy({
      hostnames: ['api.example.com'],
      hostnameStatuses: [dnsStatus('api.example.com', 'True', 'DNSRecordCreated')],
    });
    const { hostnames, deleteCount } = buildProxyDnsDeletePreview({ proxy, zoneRecords: [] });
    expect(deleteCount).toBe(1);
    expect(hostnames[0].datumRecord.type).toBeUndefined();
    expect(hostnames[0].datumRecord.value).toBeUndefined();
  });

  it('does not enrich from a record owned by a different proxy', () => {
    const proxy = makeProxy({
      hostnames: ['api.example.com'],
      hostnameStatuses: [dnsStatus('api.example.com', 'True', 'DNSRecordCreated')],
    });
    const zoneRecords: ZoneRecords[] = [
      {
        zoneDomain: 'example.com',
        records: [
          makeRecord({ managedByGateway: true, gatewaySourceName: 'other-proxy', name: 'api' }),
        ],
      },
    ];
    const { hostnames } = buildProxyDnsDeletePreview({ proxy, zoneRecords });
    expect(hostnames[0].datumRecord.type).toBeUndefined();
  });
});

describe('buildProxyDnsDeletePreview — records the user owns', () => {
  const keptProxy = makeProxy({
    name: 'edge-proxy',
    hostnames: ['www.example.com'],
    endpoint: 'http://203.0.113.10',
    hostnameStatuses: [dnsStatus('www.example.com', 'True', 'DNSRecordCreated')],
  });

  it('attaches a protected record to the hostname it shares, not a separate list', () => {
    const zoneRecords: ZoneRecords[] = [
      {
        zoneDomain: 'example.com',
        records: [makeRecord({ type: 'A', name: 'www', value: '203.0.113.10' })],
      },
    ];
    const preview = buildProxyDnsDeletePreview({ proxy: keptProxy, zoneRecords });
    expect(preview.hostnames).toHaveLength(1);
    expect(preview.hostnames[0].yourRecords).toEqual([{ type: 'A', value: '203.0.113.10' }]);
    expect(preview.keptCount).toBe(1);
  });

  it('excludes gateway-managed records, which the Datum record line already covers', () => {
    const zoneRecords: ZoneRecords[] = [
      {
        zoneDomain: 'example.com',
        records: [
          makeRecord({
            type: 'A',
            name: 'www',
            value: '203.0.113.10',
            managedByGateway: true,
            gatewaySourceName: 'edge-proxy',
          }),
        ],
      },
    ];
    const preview = buildProxyDnsDeletePreview({ proxy: keptProxy, zoneRecords });
    expect(preview.hostnames[0].yourRecords).toEqual([]);
    expect(preview.keptCount).toBe(0);
  });

  it('excludes records whose origin belongs to a different proxy', () => {
    const other = makeProxy({ ...keptProxy, endpoint: 'http://198.51.100.7' });
    const zoneRecords: ZoneRecords[] = [
      {
        zoneDomain: 'example.com',
        records: [makeRecord({ type: 'A', name: 'www', value: '203.0.113.10' })],
      },
    ];
    expect(buildProxyDnsDeletePreview({ proxy: other, zoneRecords }).keptCount).toBe(0);
  });

  it('excludes system-managed SOA and apex NS records', () => {
    const zoneRecords: ZoneRecords[] = [
      {
        zoneDomain: 'example.com',
        records: [
          makeRecord({ type: 'SOA', name: '@', value: 'ns1.datum.net.' }),
          makeRecord({ type: 'NS', name: '@', value: 'ns1.datum.net.' }),
        ],
      },
    ];
    expect(buildProxyDnsDeletePreview({ proxy: keptProxy, zoneRecords }).keptCount).toBe(0);
  });

  it('reports no protected records when the zone records are not loaded', () => {
    const preview = buildProxyDnsDeletePreview({ proxy: keptProxy, zoneRecords: [] });
    expect(preview.keptCount).toBe(0);
    expect(preview.hostnames[0].yourRecords).toEqual([]);
  });
});
