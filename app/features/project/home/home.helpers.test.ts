import {
  attentionItems,
  domainsWithoutZone,
  formatCompactCurrency,
  formatCompactUsage,
  HOME_COLUMN_LIMIT,
  newestFirst,
  shortTimeAgo,
  toRecentItems,
  topMeters,
  topQuotas,
  type QuotaItem,
} from './home.helpers';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { DnsZone } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';
import type { HttpProxy } from '@/resources/http-proxies';
import type { ResourceRegistration } from '@/resources/resource-registrations';
import type { SearchHit } from '@/resources/search';
import { describe, expect, it } from 'bun:test';

const domain = (name: string, createdAt: string): Domain => ({
  uid: `uid-${name}`,
  name,
  resourceVersion: '1',
  createdAt: new Date(createdAt),
  domainName: `${name}.com`,
});

const hit = (uid: string, kind: string, extra: Partial<SearchHit> = {}): SearchHit => ({
  uid,
  name: `name-${uid}`,
  apiVersion: '',
  kind,
  relevanceScore: 0,
  tenant: { name: 'my-project', type: 'Project' },
  ...extra,
});

describe('newestFirst', () => {
  it('orders newest first', () => {
    const result = newestFirst([
      domain('old', '2026-01-01'),
      domain('new', '2026-03-01'),
      domain('mid', '2026-02-01'),
    ]);
    expect(result.map((d) => d.name)).toEqual(['new', 'mid', 'old']);
  });

  it('caps at the column limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => domain(`d${i}`, `2026-01-0${i + 1}`));
    expect(newestFirst(many)).toHaveLength(HOME_COLUMN_LIMIT);
  });

  it('does not reorder the input array', () => {
    const input = [domain('old', '2026-01-01'), domain('new', '2026-03-01')];
    newestFirst(input);
    expect(input.map((d) => d.name)).toEqual(['old', 'new']);
  });

  it('returns an empty list for no domains', () => {
    expect(newestFirst([])).toEqual([]);
  });
});

describe('toRecentItems', () => {
  it('maps hits to rows with a detail link', () => {
    const [item] = toRecentItems([hit('a', 'Domain', { displayName: 'Example' })]);
    expect(item).toMatchObject({ key: 'a', kind: 'Domain', label: 'Example' });
    expect(item.href).toContain('my-project');
    expect(item.href).toContain('name-a');
  });

  it('falls back to the resource name without a display name', () => {
    const [item] = toRecentItems([hit('a', 'DNSZone')]);
    expect(item.label).toBe('name-a');
  });

  it('drops kinds that have no detail page', () => {
    const items = toRecentItems([hit('a', 'Unknown'), hit('b', 'Domain')]);
    expect(items.map((i) => i.key)).toEqual(['b']);
  });

  it('caps at the column limit after dropping unlinkable kinds', () => {
    const hits = [
      hit('x', 'Unknown'),
      ...Array.from({ length: 7 }, (_, i) => hit(`h${i}`, 'Domain')),
    ];
    const items = toRecentItems(hits);
    expect(items).toHaveLength(HOME_COLUMN_LIMIT);
    expect(items[0].key).toBe('h0');
  });
});

const bucket = (resourceType: string, allocated: number, limit: number): AllowanceBucket => ({
  uid: `uid-${resourceType}`,
  name: resourceType,
  namespace: 'default',
  resourceType,
  status: { allocated, limit, available: Math.max(0, limit - allocated) },
});

const registration = (
  resourceType: string,
  extra: Partial<ResourceRegistration> = {}
): ResourceRegistration => ({ resourceType, type: 'Entity', ...extra }) as ResourceRegistration;

describe('topQuotas', () => {
  it('orders fullest first, ties by label', () => {
    const items = topQuotas(
      [bucket('b', 1, 10), bucket('a', 5, 10), bucket('c', 5, 10)],
      [registration('a', { displayName: 'Alpha' }), registration('c', { displayName: 'Charlie' })],
      null
    );
    expect(items.map((i) => i.label)).toEqual(['Alpha', 'Charlie', 'b']);
    expect(items[0]).toMatchObject({ used: 5, limit: 10, percentage: 50 });
  });

  it('drops Feature registrations and buckets without a limit', () => {
    const items = topQuotas(
      [bucket('flag', 0, 1), bucket('unlimited', 3, 0), bucket('kept', 1, 4)],
      [registration('flag', { type: 'Feature' })],
      null
    );
    expect(items.map((i) => i.key)).toEqual(['uid-kept']);
  });

  it('hides gated services the project is not entitled to', () => {
    const buckets = [bucket('workloads', 1, 10), bucket('gateways', 1, 10)];
    const registrations = [registration('workloads', { service: 'compute.datumapis.com' })];

    expect(topQuotas(buckets, registrations, new Set()).map((i) => i.key)).toEqual([
      'uid-gateways',
    ]);
    expect(
      topQuotas(buckets, registrations, new Set(['compute.datumapis.com'])).map((i) => i.key)
    ).toEqual(['uid-gateways', 'uid-workloads']);
    // Unknown entitlements hide nothing.
    expect(topQuotas(buckets, registrations, null)).toHaveLength(2);
  });

  it('caps the percentage at 100', () => {
    const [item] = topQuotas([bucket('over', 15, 10)], [], null);
    expect(item.percentage).toBe(100);
  });

  it('caps at the column limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => bucket(`r${i}`, i, 10));
    expect(topQuotas(many, [], null)).toHaveLength(HOME_COLUMN_LIMIT);
  });
});

describe('topMeters', () => {
  it('orders by spend, then usage, then label', () => {
    const meters = topMeters(
      [
        { label: 'idle', used: 0 },
        { label: 'busy', used: 50 },
        { label: 'paid', used: 1, spend: 2 },
        { label: 'also-busy', used: 50 },
      ],
      3
    );
    expect(meters.map((m) => m.label)).toEqual(['paid', 'also-busy', 'busy']);
  });
});

const ready = { conditions: [{ type: 'Ready', status: 'True' }] };
const notReady = { conditions: [{ type: 'Ready', status: 'False', message: 'Waiting' }] };

const zone = (domainName: string, status: unknown = ready): DnsZone =>
  ({ uid: `zone-${domainName}`, name: domainName, domainName, status }) as DnsZone;

const proxy = (name: string, status: unknown = ready): HttpProxy =>
  ({ uid: `proxy-${name}`, name, status }) as HttpProxy;

const quota = (label: string, percentage: number): QuotaItem => ({
  key: label,
  label,
  used: percentage,
  limit: 100,
  percentage,
});

describe('attentionItems', () => {
  const none = { projectId: 'p', domains: [], zones: [], proxies: [], quotas: [] };

  it('is empty for a healthy project', () => {
    expect(
      attentionItems({
        ...none,
        domains: [{ ...domain('ok', '2026-01-01'), status: ready } as Domain],
        zones: [zone('ok.com')],
        proxies: [proxy('ok')],
        quotas: [quota('Gateways', 50)],
      })
    ).toEqual([]);
  });

  it('flags unverified domains as warnings', () => {
    const [item] = attentionItems({ ...none, domains: [domain('new', '2026-01-01')] });
    expect(item).toMatchObject({ severity: 'warning', label: "new.com isn't verified" });
    expect(item.href).toContain('/domains/new/overview');
  });

  it('flags DNS zones that failed to program', () => {
    const failed = {
      conditions: [{ type: 'Programmed', status: 'False', reason: 'ZoneConflict', message: '' }],
    };
    const [item] = attentionItems({ ...none, zones: [zone('bad.com', failed)] });
    expect(item.severity).toBe('error');
    expect(item.label).toStartWith('bad.com: ');
  });

  it('flags rejected load balancers and failed certificates, not ones still provisioning', () => {
    const rejected = { conditions: [{ type: 'Accepted', status: 'False', reason: 'Invalid' }] };
    const certFailed = {
      conditions: [{ type: 'CertificatesReady', status: 'False', reason: 'CertificatesFailed' }],
    };
    const items = attentionItems({
      ...none,
      proxies: [proxy('rejected', rejected), proxy('cert', certFailed), proxy('busy', notReady)],
    });
    expect(items.map((i) => i.label)).toEqual([
      "rejected's configuration was rejected",
      "cert couldn't get a certificate",
    ]);
  });

  it('flags quotas near or at their limit, errors first', () => {
    const items = attentionItems({
      ...none,
      domains: [domain('new', '2026-01-01')],
      quotas: [quota('Gateways', 95), quota('Zones', 100), quota('Proxies', 89)],
    });
    expect(items.map((i) => i.label)).toEqual([
      'Zones quota is used up',
      "new.com isn't verified",
      'Gateways is at 95% of its quota',
    ]);
  });
});

describe('domainsWithoutZone', () => {
  it('returns domains with no matching zone, newest first, ignoring case', () => {
    const result = domainsWithoutZone(
      [domain('old', '2026-01-01'), domain('zoned', '2026-02-01'), domain('new', '2026-03-01')],
      [zone('ZONED.com')]
    );
    expect(result.map((d) => d.name)).toEqual(['new', 'old']);
  });
});

describe('formatCompactUsage', () => {
  it('shortens large counts and long durations', () => {
    expect(formatCompactUsage('count', 130_003)).toBe('130K');
    expect(formatCompactUsage('count', 8_512)).toBe('8,512');
    expect(formatCompactUsage('duration', 8580.1 * 86_400)).toBe('8.6K d');
    expect(formatCompactUsage('duration', 90)).toBe('1.5m');
  });
});

describe('formatCompactCurrency', () => {
  it('keeps cents for small amounts and compacts large ones', () => {
    expect(formatCompactCurrency(12.5)).toBe('$12.50');
    expect(formatCompactCurrency(7_164_070_564.5)).toBe('$7.16B');
  });
});

describe('shortTimeAgo', () => {
  const now = new Date('2026-09-30T12:00:00Z');
  const ago = (ms: number) => shortTimeAgo(new Date(now.getTime() - ms), now);

  it('picks the largest whole unit', () => {
    expect(ago(30_000)).toBe('now');
    expect(ago(5 * 60_000)).toBe('5m');
    expect(ago(3 * 3_600_000)).toBe('3h');
    expect(ago(2 * 86_400_000)).toBe('2d');
    expect(ago(15 * 86_400_000)).toBe('2w');
  });
});
