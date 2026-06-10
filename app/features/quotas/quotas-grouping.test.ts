import { groupQuotas, type QuotaRow } from './quotas-grouping';
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
