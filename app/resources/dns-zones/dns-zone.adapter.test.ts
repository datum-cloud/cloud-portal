import {
  toCreateDnsZonePayload,
  toDnsZone,
  toDnsZoneList,
  toUpdateDnsZonePayload,
} from './dns-zone.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toDnsZone', () => {
  it('maps metadata + spec and prefers spec.domainName for displayName', () => {
    const raw = {
      metadata: rawMetadata({
        uid: 'z-1',
        name: 'acme-zone',
        namespace: 'proj-1',
        resourceVersion: '11',
        annotations: { 'kubernetes.io/description': 'primary zone' },
      }),
      spec: { domainName: 'acme.example', dnsZoneClassName: 'datum-external-global-dns' },
      status: { phase: 'Ready' },
    };
    const zone = toDnsZone(raw as never);

    expect(zone.uid).toBe('z-1');
    expect(zone.name).toBe('acme-zone');
    expect(zone.namespace).toBe('proj-1');
    expect(zone.displayName).toBe('acme.example');
    expect(zone.description).toBe('primary zone');
    expect(zone.domainName).toBe('acme.example');
    expect(zone.dnsZoneClassName).toBe('datum-external-global-dns');
    expect(zone.status).toEqual({ phase: 'Ready' });
  });

  it('falls back to metadata.name for displayName when spec.domainName is absent', () => {
    const raw = {
      metadata: rawMetadata({ name: 'fallback-zone' }),
      spec: { dnsZoneClassName: 'datum-external-global-dns' },
    };
    expect(toDnsZone(raw as never).displayName).toBe('fallback-zone');
  });
});

describe('toDnsZoneList', () => {
  it('filters out zones with a deletionTimestamp', () => {
    const items = [
      { metadata: rawMetadata({ name: 'live' }), spec: { domainName: 'live.example' } },
      {
        metadata: rawMetadata({ name: 'deleting', deletionTimestamp: '2024-02-02T00:00:00Z' }),
        spec: { domainName: 'deleting.example' },
      },
    ];
    const list = toDnsZoneList(items as never, 'tok');

    expect(list.items.map((z) => z.name)).toEqual(['live']);
    expect(list.nextCursor).toBe('tok');
    expect(list.hasMore).toBe(true);
  });
});

describe('toCreateDnsZonePayload', () => {
  it('builds a DNSZone with the fixed class and description annotation', () => {
    const payload = toCreateDnsZonePayload({ domainName: 'acme.example', description: 'prod zone' });

    expect(payload.kind).toBe('DNSZone');
    expect(payload.apiVersion).toBe('dns.networking.miloapis.com/v1alpha1');
    expect(payload.spec.domainName).toBe('acme.example');
    expect(payload.spec.dnsZoneClassName).toBe('datum-external-global-dns');
    expect(payload.metadata.annotations['kubernetes.io/description']).toBe('prod zone');
    // name = generateId(domainName, { randomText }) — assert the stable slug prefix.
    expect(payload.metadata.name).toMatch(/^acme-example/);
  });

  it('defaults the description annotation to an empty string', () => {
    const payload = toCreateDnsZonePayload({ domainName: 'acme.example' } as never);
    expect(payload.metadata.annotations['kubernetes.io/description']).toBe('');
  });
});

describe('toUpdateDnsZonePayload', () => {
  it('emits a description-annotation patch', () => {
    expect(toUpdateDnsZonePayload({ description: 'updated' })).toEqual({
      kind: 'DNSZone',
      apiVersion: 'dns.networking.miloapis.com/v1alpha1',
      metadata: { annotations: { 'kubernetes.io/description': 'updated' } },
    });
  });

  it('defaults the annotation to an empty string when no description is given', () => {
    expect(toUpdateDnsZonePayload({}).metadata.annotations['kubernetes.io/description']).toBe('');
  });
});
