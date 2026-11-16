import { facetWindowKey, keepPreviousInScope } from './o11y-log.queries';
import { o11yLogKeys } from './o11y-log.service';
import type { Query } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

const queryWithKey = (queryKey: readonly unknown[]) =>
  ({ queryKey }) as unknown as Query<string[], Error, string[], readonly unknown[]>;

describe('keepPreviousInScope', () => {
  const previous = ['GET'];

  it('keeps the previous data for the same project and ALB', () => {
    const keep = keepPreviousInScope<string[]>('p1', 'alb-a');
    const key = o11yLogKeys.queryRange('p1', 'alb-a', '{q="old"}', 'w', 100);
    expect(keep(previous, queryWithKey(key))).toBe(previous);
  });

  it('drops it when the ALB or project changes', () => {
    const keep = keepPreviousInScope<string[]>('p1', 'alb-a');
    expect(keep(previous, queryWithKey(o11yLogKeys.queryRange('p1', 'alb-b', 'q', 'w', 100)))).toBe(
      undefined
    );
    expect(keep(previous, queryWithKey(o11yLogKeys.queryRange('p2', 'alb-a', 'q', 'w', 100)))).toBe(
      undefined
    );
    expect(keep(undefined, undefined)).toBe(undefined);
  });

  it('matches the scope query for label values', () => {
    const keep = keepPreviousInScope<string[]>('p1', '{route="a"}');
    const key = o11yLogKeys.labelValues('p1', '{route="a"}', 'method', 'preset:last-1h');
    expect(keep(previous, queryWithKey(key))).toBe(previous);
  });
});

describe('facetWindowKey', () => {
  it('keys a preset by name, so re-anchoring it to now keeps the key', () => {
    const earlier = {
      from: '2026-11-09T10:00:00Z',
      to: '2026-11-09T10:30:00Z',
      preset: 'last-30m',
    };
    const later = { from: '2026-11-09T10:05:00Z', to: '2026-11-09T10:35:00Z', preset: 'last-30m' };
    expect(facetWindowKey(earlier, false)).toBe(facetWindowKey(later, false));
  });

  it('keys an absolute range by its bounds, and live by preset', () => {
    expect(facetWindowKey({ from: 'a', to: 'b' }, false)).toBe('a/b');
    expect(facetWindowKey({ from: 'a', to: 'b', preset: 'last-1h' }, true)).toBe('live:last-1h');
  });
});
