/// <reference types="bun-types/test" />
// app/features/search/engine/useSearchEngine.test.ts
//
// Test scope adaptation note:
// -----------------------------------------------------------------------------
// This repo does NOT have `@testing-library/react` or any JSDOM/happy-dom
// adapter installed (see package.json — only `@testing-library/cypress`
// exists for E2E). bun:test runs in a Node-like environment with no DOM.
//
// The originally drafted test plan used `renderHook` from
// `@testing-library/react`, which cannot work here without pulling in a
// substantial new dev-dependency tree (jsdom + @testing-library/react +
// @testing-library/dom). That is out of scope for this task and would also
// diverge from the existing repo testing pattern (see
// app/resources/search/search.*.test.ts and
// app/lib/feature-flags/milo-provider.test.ts — all pure-logic, no
// rendering).
//
// Pragmatic adaptation: the engine's pure helpers — `groupByKind`,
// `computeStatusText`, `scopeKey`, and `getHitPosition` — are exported from
// `useSearchEngine.ts` for testability and tested here directly. They
// encode the substantive behavior of grouping, capping, scope routing, and
// a11y status text. The React-side orchestration (useEffect telemetry
// triggers, useQuery dispatch, ARIA prop wiring) is thin glue that
// bun:test cannot exercise without a DOM; it is reviewed by inspection in
// `useSearchEngine.ts` itself and will be covered by the upcoming Cypress
// component tests that already exist in this repo's E2E setup.
import { computeStatusText, getHitPosition, groupByKind, scopeKey } from './useSearchEngine';
import { GROUP_RESULT_CAP } from '@/resources/search';
import type { SearchHit } from '@/resources/search';
import { describe, expect, it } from 'bun:test';

const hit = (uid: string, kind: string): SearchHit => ({
  uid,
  name: uid,
  apiVersion: '',
  kind,
  relevanceScore: 1,
  tenant: { name: 'acme', type: 'Project' },
});

describe('scopeKey', () => {
  it('returns "project:<id>" for a non-null projectId', () => {
    expect(scopeKey('alpha')).toBe('project:alpha');
  });

  it('returns null when projectId is null (no active project)', () => {
    expect(scopeKey(null)).toBeNull();
  });
});

describe('groupByKind', () => {
  it('returns empty groups for empty hit list', () => {
    expect(groupByKind([])).toEqual({ groups: [], hasOverflow: false });
  });

  it('groups hits by kind preserving order within group', () => {
    const hits = [hit('a', 'DnsZone'), hit('b', 'Domain'), hit('c', 'DnsZone')];
    const { groups } = groupByKind(hits);
    const dns = groups.find((g) => g.kind === 'DnsZone');
    expect(dns?.hits.map((h) => h.uid)).toEqual(['a', 'c']);
  });

  it('caps hits per kind at GROUP_RESULT_CAP and reports hasMore=true', () => {
    const hits = Array.from({ length: 7 }, (_, i) => hit(`d${i}`, 'DnsZone'));
    const { groups, hasOverflow } = groupByKind(hits);
    const dns = groups.find((g) => g.kind === 'DnsZone');
    expect(dns?.hits).toHaveLength(GROUP_RESULT_CAP);
    expect(dns?.hasMore).toBe(true);
    expect(hasOverflow).toBe(true);
  });

  it('reports hasMore=false and hasOverflow=false when no group exceeds cap', () => {
    const hits = [hit('a', 'DnsZone'), hit('b', 'DnsZone'), hit('c', 'Domain')];
    const { groups, hasOverflow } = groupByKind(hits);
    expect(hasOverflow).toBe(false);
    for (const g of groups) {
      expect(g.hasMore).toBe(false);
    }
  });

  it('reports group-level hasMore independently of other groups', () => {
    const hits = [
      ...Array.from({ length: 7 }, (_, i) => hit(`d${i}`, 'DnsZone')),
      hit('z1', 'Domain'),
    ];
    const { groups, hasOverflow } = groupByKind(hits);
    expect(hasOverflow).toBe(true);
    expect(groups.find((g) => g.kind === 'DnsZone')?.hasMore).toBe(true);
    expect(groups.find((g) => g.kind === 'Domain')?.hasMore).toBe(false);
  });
});

describe('computeStatusText', () => {
  it('returns "Searching…" while loading', () => {
    expect(
      computeStatusText({
        isLoading: true,
        isError: false,
        totalHits: 0,
        query: 'acme',
        hasPartialPermission: false,
      })
    ).toBe('Searching…');
  });

  it('reports unavailability on error', () => {
    expect(
      computeStatusText({
        isLoading: false,
        isError: true,
        totalHits: 0,
        query: 'acme',
        hasPartialPermission: false,
      })
    ).toBe('Search is temporarily unavailable.');
  });

  it('reports zero-result query with the term', () => {
    expect(
      computeStatusText({
        isLoading: false,
        isError: false,
        totalHits: 0,
        query: 'acme',
        hasPartialPermission: false,
      })
    ).toBe('No results for acme.');
  });

  it('pluralizes result counts', () => {
    expect(
      computeStatusText({
        isLoading: false,
        isError: false,
        totalHits: 1,
        query: 'acme',
        hasPartialPermission: false,
      })
    ).toBe('1 result.');

    expect(
      computeStatusText({
        isLoading: false,
        isError: false,
        totalHits: 4,
        query: 'acme',
        hasPartialPermission: false,
      })
    ).toBe('4 results.');
  });

  it('mentions hidden kinds on partial permission', () => {
    expect(
      computeStatusText({
        isLoading: false,
        isError: false,
        totalHits: 2,
        query: 'acme',
        hasPartialPermission: true,
      })
    ).toBe('2 results. Some kinds hidden.');
  });

  it('returns empty string for idle state', () => {
    expect(
      computeStatusText({
        isLoading: false,
        isError: false,
        totalHits: 0,
        query: '',
        hasPartialPermission: false,
      })
    ).toBe('');
  });

  it('returns "Open a project to search." when inactiveReason is no-project', () => {
    expect(
      computeStatusText({
        isLoading: false,
        isError: false,
        totalHits: 0,
        query: '',
        hasPartialPermission: false,
        inactiveReason: 'no-project',
      })
    ).toBe('Open a project to search.');
  });

  it('inactive state takes precedence over loading/error/result text', () => {
    expect(
      computeStatusText({
        isLoading: true,
        isError: true,
        totalHits: 5,
        query: 'acme',
        hasPartialPermission: true,
        inactiveReason: 'no-project',
      })
    ).toBe('Open a project to search.');
  });
});

describe('getHitPosition', () => {
  it('finds the hit in the first group and reports 1-based positions', () => {
    const groups = [
      { kind: 'DnsZone', hits: [hit('a', 'DnsZone'), hit('b', 'DnsZone')], hasMore: false },
      { kind: 'Domain', hits: [hit('c', 'Domain')], hasMore: false },
    ];
    expect(getHitPosition(groups, 'b')).toEqual({ groupPosition: 2, globalPosition: 2 });
  });

  it('finds the hit in a later group', () => {
    const groups = [
      { kind: 'DnsZone', hits: [hit('a', 'DnsZone'), hit('b', 'DnsZone')], hasMore: false },
      { kind: 'Domain', hits: [hit('c', 'Domain')], hasMore: false },
    ];
    expect(getHitPosition(groups, 'c')).toEqual({ groupPosition: 1, globalPosition: 3 });
  });

  it('returns sentinel positions (1,1) when uid is not found', () => {
    const groups = [{ kind: 'DnsZone', hits: [hit('a', 'DnsZone')], hasMore: false }];
    expect(getHitPosition(groups, 'zzz')).toEqual({ groupPosition: 1, globalPosition: 1 });
  });
});
