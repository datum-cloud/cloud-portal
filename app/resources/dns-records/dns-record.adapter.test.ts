import {
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

describe('toCreateDnsRecordSetPayload', () => {
  it('derives a lowercased name from zone id + record type', () => {
    const payload = toCreateDnsRecordSetPayload(
      { dnsZoneRef: { name: 'acme-zone' }, recordType: 'A', records: [] } as never,
      'Acme-Zone'
    );
    expect(payload.kind).toBe('DNSRecordSet');
    expect(payload.metadata?.name).toBe('acme-zone-a');
    expect(payload.spec?.recordType).toBe('A');
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
