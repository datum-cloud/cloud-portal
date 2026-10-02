import { filterUsageByEntitlement } from './usage-entitlements';
import type { UsageFetchResult } from './usage.types';
import { describe, expect, test } from 'bun:test';

const meter = (meterApiName: string, groupId: string): UsageFetchResult['meters'][number] =>
  ({
    meterApiName,
    label: meterApiName,
    values: [],
    groupId,
  }) as UsageFetchResult['meters'][number];

const result: UsageFetchResult = {
  status: 'ok',
  days: 30,
  meters: [
    meter('compute-vcpu-seconds', 'compute.datumapis.com'),
    meter('alb-requests', 'networking.datumapis.com'),
    meter('assistant-tokens', 'assistant.miloapis.com'),
  ],
  groups: [
    { id: 'compute.datumapis.com', title: 'Compute', meterApiNames: ['compute-vcpu-seconds'] },
    { id: 'networking.datumapis.com', title: 'Networking', meterApiNames: ['alb-requests'] },
    { id: 'assistant.miloapis.com', title: 'AI Assistant', meterApiNames: ['assistant-tokens'] },
  ],
} as UsageFetchResult;

describe('filterUsageByEntitlement', () => {
  test('drops gated groups the scope is not entitled to, with their meters', () => {
    const filtered = filterUsageByEntitlement(result, new Set(['networking.datumapis.com']));
    expect(filtered.groups?.map((g) => g.id)).toEqual([
      'networking.datumapis.com',
      'assistant.miloapis.com',
    ]);
    expect(filtered.meters.map((m) => m.meterApiName)).toEqual([
      'alb-requests',
      'assistant-tokens',
    ]);
  });

  test('keeps everything when entitlements are unknown', () => {
    expect(filterUsageByEntitlement(result, null)).toBe(result);
  });

  test('keeps a result that has no groups untouched', () => {
    const flat = { ...result, groups: undefined };
    expect(filterUsageByEntitlement(flat, new Set())).toBe(flat);
  });

  test('does not mutate the input', () => {
    const before = JSON.stringify(result);
    filterUsageByEntitlement(result, new Set());
    expect(JSON.stringify(result)).toBe(before);
  });
});
