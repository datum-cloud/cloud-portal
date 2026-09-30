import {
  buildQuotaRows,
  filterQuotasByEntitlement,
  groupQuotas,
  type QuotaRow,
} from './quotas-grouping';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { ResourceRegistration } from '@/resources/resource-registrations';
import { describe, expect, it } from 'bun:test';

const row = (partial: Partial<QuotaRow>): QuotaRow => ({
  resourceType: 'x/y',
  displayName: 'X',
  group: 'Platform Core',
  percentage: 0,
  ...partial,
});

describe('groupQuotas', () => {
  it('groups by group name, sorted A→Z with Other last', () => {
    const groups = groupQuotas([
      row({ group: 'Other', displayName: 'Z' }),
      row({ group: 'Networking', displayName: 'HTTP Proxies' }),
      row({ group: 'DNS', displayName: 'DNS Zones' }),
    ]);
    expect(groups.map((g) => g.group)).toEqual(['DNS', 'Networking', 'Other']);
  });

  it('orders items within a group by percentage desc, then display name', () => {
    const groups = groupQuotas([
      row({ group: 'DNS', displayName: 'DNS Zones', percentage: 16 }),
      row({ group: 'DNS', displayName: 'DNS Record Sets', percentage: 80 }),
    ]);
    expect(groups[0].items.map((i) => i.displayName)).toEqual(['DNS Record Sets', 'DNS Zones']);
  });
});

const bucket = (resourceType: string, allocated = 0, limit = 10): AllowanceBucket =>
  ({ name: resourceType, resourceType, status: { allocated, limit } }) as AllowanceBucket;

const registrations: Record<string, ResourceRegistration> = {
  'compute.datumapis.com/vcpus': {
    name: 'vcpus',
    resourceType: 'compute.datumapis.com/vcpus',
    type: 'Entity',
    service: 'compute.datumapis.com',
  } as ResourceRegistration,
  'dns.networking.miloapis.com/dnszones': {
    name: 'dnszones',
    resourceType: 'dns.networking.miloapis.com/dnszones',
    type: 'Entity',
    displayName: 'DNS Zones',
  } as ResourceRegistration,
  'core.miloapis.com/flag': {
    name: 'flag',
    resourceType: 'core.miloapis.com/flag',
    type: 'Feature',
    service: 'core.miloapis.com',
  } as ResourceRegistration,
};

describe('filterQuotasByEntitlement', () => {
  const buckets = [
    bucket('compute.datumapis.com/vcpus'),
    bucket('dns.networking.miloapis.com/dnszones'),
    bucket('billing.miloapis.com/billingaccount/count'),
  ];

  it('drops gated services the scope is not entitled to, with their registrations', () => {
    const kept = filterQuotasByEntitlement(
      buckets,
      registrations,
      new Set(['networking.datumapis.com'])
    );
    expect(kept.buckets.map((b) => b.resourceType)).toEqual([
      'dns.networking.miloapis.com/dnszones',
      'billing.miloapis.com/billingaccount/count',
    ]);
    expect(Object.keys(kept.registrations)).toEqual(['dns.networking.miloapis.com/dnszones']);
  });

  it('keeps a gated service the scope is entitled to', () => {
    const kept = filterQuotasByEntitlement(
      buckets,
      registrations,
      new Set(['compute.datumapis.com'])
    );
    expect(kept.buckets).toHaveLength(3);
    expect(kept.registrations).toBe(registrations);
  });

  it('returns the inputs untouched when entitlements are unknown', () => {
    const kept = filterQuotasByEntitlement(buckets, registrations, null);
    expect(kept.buckets).toBe(buckets);
    expect(kept.registrations).toBe(registrations);
  });
});

describe('buildQuotaRows', () => {
  it('skips Feature registrations and resolves service, group and usage', () => {
    const rows = buildQuotaRows(
      [
        bucket('compute.datumapis.com/vcpus', 8, 10),
        bucket('dns.networking.miloapis.com/dnszones', 1, 4),
        bucket('core.miloapis.com/flag'),
      ],
      registrations
    );
    expect(rows.map((r) => r.resourceType)).toEqual([
      'compute.datumapis.com/vcpus',
      'dns.networking.miloapis.com/dnszones',
    ]);
    expect(rows[0]).toMatchObject({ group: 'Compute', displayName: 'vCPUs', percentage: 80 });
    expect(rows[1]).toMatchObject({ group: 'DNS', displayName: 'DNS Zones', percentage: 25 });
  });

  it('files unknown owners under Other', () => {
    const [row] = buildQuotaRows([bucket('mystery.example.com/things')], {});
    expect(row.group).toBe('Other');
  });
});
