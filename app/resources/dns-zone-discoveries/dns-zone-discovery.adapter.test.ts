import {
  generateDnsZoneDiscoveryName,
  toCreateDnsZoneDiscoveryPayload,
  toDnsZoneDiscovery,
  toDnsZoneDiscoveryList,
} from './dns-zone-discovery.adapter';
import { rawMetadata } from '@/test/factories/k8s';
import { describe, expect, it } from 'bun:test';

describe('toDnsZoneDiscovery', () => {
  it('maps metadata and status.recordSets, normalizing createdAt to ISO', () => {
    const raw = {
      metadata: rawMetadata({ uid: 'd-1', name: 'disc-1', resourceVersion: '3' }),
      status: { recordSets: [{ name: 'www' }] },
    };
    const discovery = toDnsZoneDiscovery(raw as never);

    expect(discovery.uid).toBe('d-1');
    expect(discovery.name).toBe('disc-1');
    expect(discovery.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(discovery.recordSets).toEqual([{ name: 'www' }]);
  });

  it('leaves createdAt/recordSets undefined when absent', () => {
    const discovery = toDnsZoneDiscovery({ metadata: {} } as never);
    expect(discovery.createdAt).toBeUndefined();
    expect(discovery.recordSets).toBeUndefined();
  });
});

describe('toDnsZoneDiscoveryList', () => {
  it('maps items and surfaces pagination', () => {
    const list = toDnsZoneDiscoveryList([{ metadata: rawMetadata({ uid: 'a' }) }] as never, 'tok');
    expect(list.items[0].uid).toBe('a');
    expect(list.hasMore).toBe(true);
  });
});

describe('generateDnsZoneDiscoveryName', () => {
  it('prefixes the generated id with dns-zone-discovery-', () => {
    expect(generateDnsZoneDiscoveryName('acme-zone')).toMatch(/^dns-zone-discovery-acme-zone/);
  });
});

describe('toCreateDnsZoneDiscoveryPayload', () => {
  it('builds a DNSZoneDiscovery referencing the zone', () => {
    const payload = toCreateDnsZoneDiscoveryPayload('acme-zone');
    expect(payload.kind).toBe('DNSZoneDiscovery');
    expect(payload.apiVersion).toBe('dns.networking.miloapis.com/v1alpha1');
    expect(payload.spec?.dnsZoneRef).toEqual({ name: 'acme-zone' });
    expect(payload.metadata?.name).toMatch(/^dns-zone-discovery-acme-zone/);
  });
});
