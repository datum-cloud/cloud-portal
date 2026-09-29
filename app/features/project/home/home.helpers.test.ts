import { HOME_COLUMN_LIMIT, toRecentItems, topDomains } from './home.helpers';
import type { Domain } from '@/resources/domains';
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

describe('topDomains', () => {
  it('orders newest first', () => {
    const result = topDomains([
      domain('old', '2026-01-01'),
      domain('new', '2026-03-01'),
      domain('mid', '2026-02-01'),
    ]);
    expect(result.map((d) => d.name)).toEqual(['new', 'mid', 'old']);
  });

  it('caps at the column limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => domain(`d${i}`, `2026-01-0${i + 1}`));
    expect(topDomains(many)).toHaveLength(HOME_COLUMN_LIMIT);
  });

  it('does not reorder the input array', () => {
    const input = [domain('old', '2026-01-01'), domain('new', '2026-03-01')];
    topDomains(input);
    expect(input.map((d) => d.name)).toEqual(['old', 'new']);
  });

  it('returns an empty list for no domains', () => {
    expect(topDomains([])).toEqual([]);
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
