import {
  getActiveProject,
  setActiveProject,
  clearActiveProject,
  type ActiveProject,
} from './search.active-project';
import { beforeEach, describe, expect, it } from 'bun:test';

// localStorage polyfill for bun:test
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

const sample = (overrides: Partial<ActiveProject> = {}): ActiveProject => ({
  id: 'acme-prod',
  displayName: 'Acme Production',
  orgId: 'acme-co',
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
});

describe('search.active-project', () => {
  it('returns null when nothing stored', () => {
    expect(getActiveProject()).toBeNull();
  });

  it('roundtrips an active project through localStorage', () => {
    const p = sample();
    setActiveProject(p);
    expect(getActiveProject()).toEqual(p);
  });

  it('overwrites on subsequent setActiveProject calls', () => {
    setActiveProject(sample({ id: 'a', displayName: 'A' }));
    setActiveProject(sample({ id: 'b', displayName: 'B' }));
    expect(getActiveProject()?.id).toBe('b');
  });

  it('clearActiveProject removes the entry', () => {
    setActiveProject(sample());
    clearActiveProject();
    expect(getActiveProject()).toBeNull();
  });

  it('returns null when stored JSON is malformed', () => {
    localStorage.setItem('datum-cloud-search-activeProject', '{not json');
    expect(getActiveProject()).toBeNull();
  });

  it('does not throw on setActiveProject(null) — clears the entry', () => {
    setActiveProject(sample());
    setActiveProject(null);
    expect(getActiveProject()).toBeNull();
  });

  it('degrades silently when localStorage throws', () => {
    const original = localStorage.setItem.bind(localStorage);
    (localStorage as any).setItem = () => {
      throw new Error('quota');
    };
    try {
      expect(() => setActiveProject(sample())).not.toThrow();
    } finally {
      (localStorage as any).setItem = original;
    }
  });
});
