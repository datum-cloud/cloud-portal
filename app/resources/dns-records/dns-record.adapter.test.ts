import {
  mergeRecordSetIntoListCache,
  ownerNameForResource,
  removeRecordSetFromListCache,
  toCreateDnsRecordSetPayload,
  toDnsRecordSet,
  toDnsRecordSetList,
  toFlattenedDnsRecords,
  toFlattenedDnsRecordsByPriority,
  toUpdateDnsRecordSetPayload,
} from './dns-record.adapter';
import type { DnsRecordSet } from './dns-record.schema';
import { ControlPlaneStatus } from '@/resources/base';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toDnsRecordSet', () => {
  it('maps spec fields and flags gateway-managed records from labels', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'rs-1',
        name: 'acme-a',
        labels: {
          'dns.datumapis.com/source-kind': 'Gateway',
          'dns.datumapis.com/source-name': 'edge-proxy',
        },
      }),
      spec: {
        dnsZoneRef: { name: 'acme-zone' },
        recordType: 'A',
        records: [{ name: 'www', a: { content: '1.2.3.4' } }],
      },
    };
    const rs = toDnsRecordSet(raw as never);

    expect(rs.dnsZoneId).toBe('acme-zone');
    expect(rs.recordType).toBe('A');
    expect(rs.records).toHaveLength(1);
    expect(rs.managedByGateway).toBe(true);
    expect(rs.gatewaySourceName).toBe('edge-proxy');
  });

  it('is not gateway-managed when the source-kind label is absent', () => {
    const rs = toDnsRecordSet({
      metadata: rawMetadata({ labels: { 'dns.datumapis.com/source-name': 'x' } }),
      spec: { recordType: 'A' },
    } as never);
    expect(rs.managedByGateway).toBe(false);
    expect(rs.gatewaySourceName).toBeUndefined();
    expect(rs.records).toEqual([]);
  });
});

describe('toDnsRecordSetList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toDnsRecordSetList(
      [{ metadata: rawMetadata({ uid: 'a' }), spec: { recordType: 'A' } }] as never,
      'tok'
    );
    expect(list.items[0].uid).toBe('a');
    expect(list.hasMore).toBe(true);
  });
});

describe('toFlattenedDnsRecords', () => {
  it('flattens each record, extracts value/ttl, and sorts by type priority then name', () => {
    const recordSets: DnsRecordSet[] = [
      {
        uid: 'rs-cname',
        name: 'cname-set',
        recordType: 'CNAME',
        dnsZoneId: 'z',
        records: [{ name: 'alias', cname: { content: 'target.example' } }],
      },
      {
        uid: 'rs-a',
        name: 'a-set',
        recordType: 'A',
        dnsZoneId: 'z',
        records: [
          { name: 'b', a: { content: '1.1.1.1' }, ttl: 300 },
          { name: 'a', a: { content: '2.2.2.2' }, ttl: 600n },
        ],
      },
    ] as never;

    const rows = toFlattenedDnsRecords(recordSets);

    // A (priority 3) before CNAME (priority 5); within A, sorted by name.
    expect(rows.map((r) => `${r.type}:${r.name}`)).toEqual(['A:a', 'A:b', 'CNAME:alias']);
    expect(rows[0].value).toBe('2.2.2.2');
    // bigint ttl is coerced to a number.
    expect(rows[0].ttl).toBe(600);
    expect(rows[1].ttl).toBe(300);
    expect(rows[2].value).toBe('target.example');
  });

  it('derives per-record Programmed status from status.recordSets[record.name]', () => {
    const recordSets: DnsRecordSet[] = [
      {
        uid: 'rs-1',
        name: 'a-set',
        recordType: 'A',
        dnsZoneId: 'z',
        records: [
          { name: 'ok', a: { content: '1.1.1.1' } },
          { name: 'bad', a: { content: '2.2.2.2' } },
        ],
        status: {
          conditions: [
            { type: 'Accepted', status: 'True' },
            { type: 'Programmed', status: 'True' },
          ],
          recordSets: [
            { name: 'ok', conditions: [{ type: 'Programmed', status: 'True', reason: 'Ready' }] },
            {
              name: 'bad',
              conditions: [
                { type: 'Programmed', status: 'False', reason: 'Invalid', message: 'bad value' },
              ],
            },
          ],
        },
      },
    ] as never;

    const rows = toFlattenedDnsRecords(recordSets);
    const ok = rows.find((r) => r.name === 'ok')!;
    const bad = rows.find((r) => r.name === 'bad')!;

    expect(ok.status.isProgrammed).toBe(true);
    expect(ok.status.status).toBe(ControlPlaneStatus.Success);
    expect(bad.status.isProgrammed).toBe(false);
    expect(bad.status.status).toBe(ControlPlaneStatus.Pending);
    expect(bad.status.message).toBe('bad value');
  });

  it('toFlattenedDnsRecordsByPriority is an alias applying the same sort', () => {
    const recordSets: DnsRecordSet[] = [
      {
        uid: 'rs',
        name: 's',
        recordType: 'A',
        dnsZoneId: 'z',
        records: [{ name: 'b' }, { name: 'a' }],
      },
    ] as never;
    expect(toFlattenedDnsRecordsByPriority(recordSets).map((r) => r.name)).toEqual(['a', 'b']);
  });
});

describe('mergeRecordSetIntoListCache', () => {
  it('replaces only the rows for that RecordSet after a record is removed', () => {
    const previous = toFlattenedDnsRecords([
      {
        uid: 'rs-txt',
        name: 'zone-txt-apex',
        recordType: 'TXT',
        dnsZoneId: 'z',
        records: [
          { name: '@', txt: { content: 'keep' } },
          { name: '@', txt: { content: 'drop' } },
        ],
      },
      {
        uid: 'rs-www',
        name: 'zone-txt-www',
        recordType: 'TXT',
        dnsZoneId: 'z',
        records: [{ name: 'www', txt: { content: 'www-verify' } }],
      },
    ] as never);

    const patched = {
      uid: 'rs-txt',
      name: 'zone-txt-apex',
      recordType: 'TXT',
      dnsZoneId: 'z',
      records: [{ name: '@', txt: { content: 'keep' } }],
    } as DnsRecordSet;

    const merged = mergeRecordSetIntoListCache(previous, patched);
    expect(merged.map((r) => `${r.recordSetName}:${r.value}`).sort()).toEqual([
      'zone-txt-apex:keep',
      'zone-txt-www:www-verify',
    ]);
  });
});

describe('removeRecordSetFromListCache', () => {
  it('drops every flattened row for a deleted RecordSet', () => {
    const previous = toFlattenedDnsRecords([
      {
        uid: 'rs-txt',
        name: 'zone-txt-apex',
        recordType: 'TXT',
        dnsZoneId: 'z',
        records: [{ name: '@', txt: { content: 'gone' } }],
      },
      {
        uid: 'rs-www',
        name: 'zone-txt-www',
        recordType: 'TXT',
        dnsZoneId: 'z',
        records: [{ name: 'www', txt: { content: 'stay' } }],
      },
    ] as never);

    const remaining = removeRecordSetFromListCache(previous, 'zone-txt-apex');
    expect(remaining?.map((r) => r.recordSetName)).toEqual(['zone-txt-www']);
  });
});

describe('ownerNameForResource', () => {
  it('maps apex names to apex', () => {
    expect(ownerNameForResource('@')).toBe('apex');
    expect(ownerNameForResource('')).toBe('apex');
    expect(ownerNameForResource(undefined)).toBe('apex');
  });

  it('sanitizes service and wildcard names for DNS-1123', () => {
    expect(ownerNameForResource('_dmarc')).toBe('dmarc');
    expect(ownerNameForResource('*')).toBe('wildcard');
    expect(ownerNameForResource('*.cdn')).toBe('wildcard-cdn');
    expect(ownerNameForResource('www')).toBe('www');
  });
});

describe('toCreateDnsRecordSetPayload', () => {
  it('includes a sanitized owner suffix so same-type RecordSets do not collide', () => {
    const payload = toCreateDnsRecordSetPayload(
      {
        dnsZoneRef: { name: 'acme-zone' },
        recordType: 'TXT',
        records: [{ name: '@', txt: { content: 'v=spf1 -all' } }],
      } as never,
      'Acme-Zone'
    );
    expect(payload.kind).toBe('DNSRecordSet');
    expect(payload.metadata?.name).toBe('acme-zone-txt-apex');
    expect(payload.spec?.recordType).toBe('TXT');
  });

  it('uses the owner name for subdomain RecordSets', () => {
    const payload = toCreateDnsRecordSetPayload(
      {
        dnsZoneRef: { name: 'acme-zone' },
        recordType: 'A',
        records: [{ name: 'www', a: { content: '1.2.3.4' } }],
      } as never,
      'acme-zone'
    );
    expect(payload.metadata?.name).toBe('acme-zone-a-www');
  });

  it('defaults empty records to an apex suffix', () => {
    const payload = toCreateDnsRecordSetPayload(
      { dnsZoneRef: { name: 'acme-zone' }, recordType: 'A', records: [] } as never,
      'Acme-Zone'
    );
    expect(payload.metadata?.name).toBe('acme-zone-a-apex');
  });
});

describe('toUpdateDnsRecordSetPayload', () => {
  it('emits a spec.records patch', () => {
    const records = [{ name: 'www', a: { content: '1.2.3.4' } }];
    expect(toUpdateDnsRecordSetPayload(records as never)).toEqual({
      kind: 'DNSRecordSet',
      apiVersion: 'dns.networking.miloapis.com/v1alpha1',
      spec: { records },
    });
  });
});
