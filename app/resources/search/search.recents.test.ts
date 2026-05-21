import { clearRecents, pushRecentHit, pushRecentQuery, readRecents } from './search.recents';
import type { SearchHit } from './search.schema';
import { beforeEach, describe, expect, it } from 'bun:test';

// app/resources/search/search.recents.test.ts
//
// localStorage polyfill — bun:test runs in a Node-like environment where
// localStorage is not available (typeof localStorage === 'undefined').
// This polyfill must be set up BEFORE the module under test is imported so
// that the top-level typeof guard in search.recents.ts sees a defined value.
globalThis.localStorage = {
  _store: new Map<string, string>(),
  getItem(k: string) {
    return this._store.get(k) ?? null;
  },
  setItem(k: string, v: string) {
    this._store.set(k, v);
  },
  removeItem(k: string) {
    this._store.delete(k);
  },
  clear() {
    this._store.clear();
  },
  key(_index: number) {
    return null;
  },
  get length() {
    return this._store.size;
  },
} as Storage;

const sampleHit = (uid: string, name = uid): SearchHit => ({
  uid,
  name,
  apiVersion: 'dns.networking.miloapis.com/v1alpha1',
  kind: 'DNSZone',
  relevanceScore: 1,
  tenant: { name: 'acme-prod', type: 'Project' },
});

beforeEach(() => {
  localStorage.clear();
});

describe('search.recents', () => {
  it('returns empty arrays when nothing stored', () => {
    expect(readRecents('global')).toEqual({ queries: [], hits: [] });
  });

  it('pushes and dedupes queries (most recent first)', () => {
    pushRecentQuery('global', 'acme');
    pushRecentQuery('global', 'beta');
    pushRecentQuery('global', 'acme');
    expect(readRecents('global').queries).toEqual(['acme', 'beta']);
  });

  it('caps queries at RECENTS_CAPS.queries (10)', () => {
    for (let i = 0; i < 15; i++) pushRecentQuery('global', `q${i}`);
    expect(readRecents('global').queries).toHaveLength(10);
    expect(readRecents('global').queries[0]).toBe('q14');
  });

  it('pushes and dedupes hits by uid', () => {
    pushRecentHit('global', sampleHit('a'));
    pushRecentHit('global', sampleHit('b'));
    pushRecentHit('global', sampleHit('a', 'name-changed'));
    const { hits } = readRecents('global');
    expect(hits.map((h) => h.uid)).toEqual(['a', 'b']);
    expect(hits[0].name).toBe('name-changed');
  });

  it('caps hits at RECENTS_CAPS.hits (5)', () => {
    for (let i = 0; i < 8; i++) pushRecentHit('global', sampleHit(`u${i}`));
    expect(readRecents('global').hits).toHaveLength(5);
  });

  it('isolates scopes', () => {
    pushRecentQuery('global', 'global-q');
    pushRecentQuery('project:abc', 'project-q');
    expect(readRecents('global').queries).toEqual(['global-q']);
    expect(readRecents('project:abc').queries).toEqual(['project-q']);
  });

  it('clears recents for one scope only', () => {
    pushRecentQuery('global', 'g');
    pushRecentQuery('project:abc', 'p');
    clearRecents('project:abc');
    expect(readRecents('global').queries).toEqual(['g']);
    expect(readRecents('project:abc').queries).toEqual([]);
  });

  it('degrades silently when localStorage throws', () => {
    // bun:test has no `Storage` global — patch the polyfill instance directly.
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new Error('quota');
    };
    try {
      expect(() => pushRecentQuery('global', 'x')).not.toThrow();
      // The previous setItem failed, so nothing should be stored
      localStorage.setItem = original;
      expect(readRecents('global').queries).toEqual([]);
    } finally {
      localStorage.setItem = original;
    }
  });
});
