// app/resources/search/search.recents.ts
//
// localStorage helpers for recent queries and clicked hits.
// Scoped per surface: 'global' or 'project:<id>'.
//
// SSR safety: all public functions guard with `typeof localStorage === 'undefined'`
// so they are safe to import in React Router v7 server entry (no window object).
//
// Storage failures (private browsing, quota exceeded) degrade silently to
// empty recents — callers never need to handle errors.
import { RECENTS_CAPS } from './search.constants';
import type { SearchHit } from './search.schema';

export type RecentsScope = 'global' | `project:${string}`;

type Recents = { queries: string[]; hits: SearchHit[] };

const KEY_QUERIES = (scope: RecentsScope) => `datum-cloud-search-recentQueries-${scope}`;
const KEY_HITS = (scope: RecentsScope) => `datum-cloud-search-recentHits-${scope}`;

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore — private mode, quota exceeded, or SSR-no-window.
  }
}

/**
 * Read the stored recent queries and hits for the given scope.
 * Returns `{ queries: [], hits: [] }` in any error or SSR context.
 */
export function readRecents(scope: RecentsScope): Recents {
  if (typeof localStorage === 'undefined') return { queries: [], hits: [] };
  return {
    queries: safeGet<string[]>(KEY_QUERIES(scope), []),
    hits: safeGet<SearchHit[]>(KEY_HITS(scope), []),
  };
}

/**
 * Prepend `query` to the recent-queries list for the given scope.
 * Dedupes by exact trimmed string; caps at RECENTS_CAPS.queries (most recent first).
 * No-ops for empty/whitespace-only queries or in SSR.
 */
export function pushRecentQuery(scope: RecentsScope, query: string): void {
  if (typeof localStorage === 'undefined') return;
  const trimmed = query.trim();
  if (!trimmed) return;
  const prev = readRecents(scope).queries.filter((q) => q !== trimmed);
  const next = [trimmed, ...prev].slice(0, RECENTS_CAPS.queries);
  safeSet(KEY_QUERIES(scope), next);
}

/**
 * Prepend `hit` to the recent-hits list for the given scope.
 * Dedupes by `uid`, replacing the existing entry with the freshest data;
 * caps at RECENTS_CAPS.hits (most recent first).
 * No-ops for hits without a uid or in SSR.
 */
export function pushRecentHit(scope: RecentsScope, hit: SearchHit): void {
  if (typeof localStorage === 'undefined') return;
  if (!hit?.uid) return;
  const prev = readRecents(scope).hits.filter((h) => h.uid !== hit.uid);
  const next = [hit, ...prev].slice(0, RECENTS_CAPS.hits);
  safeSet(KEY_HITS(scope), next);
}

/**
 * Remove all recent queries and hits for the given scope.
 * Leaves other scopes untouched.
 */
export function clearRecents(scope: RecentsScope): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY_QUERIES(scope));
    localStorage.removeItem(KEY_HITS(scope));
  } catch {
    // Ignore
  }
}
