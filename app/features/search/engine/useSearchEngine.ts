// app/features/search/engine/useSearchEngine.ts
//
// Headless behavior hook for cloud-portal search v3.
//
// Owns ALL behavior shared across the three search surfaces (cmd-K, project
// bar, mobile sheet). Surfaces become thin presentational shells that
// compose this hook with their layout primitive (CommandDialog, Popover,
// Sheet, etc.).
//
// v3 change: scope is project-only. The hook takes `projectId: string | null`.
// When projectId is null the engine returns an inactive state
// (`inactiveReason: 'no-project'`) and skips all server calls + telemetry —
// surfaces render an "Open a project to search." empty state.
//
// Responsibilities:
// - Query state + 250ms debounce (SEARCH_DEBOUNCE_MS)
// - Project-scoped dispatch via useSearchInProject (no global path)
// - Grouping hits by kind, capped at GROUP_RESULT_CAP (5) per group
// - Reading/writing recents
// - Detecting partial-permission (deniedKinds from server)
// - Emitting telemetry events (open, queried, selected, dismissed,
//   partial_permission, error) — suppressed entirely when inactive
// - ARIA combobox/listbox props + screen-reader status text
//
// Pure helpers (groupByKind, computeStatusText, scopeKey, getHitPosition)
// are exported for direct unit testing — see `./useSearchEngine.test.ts`.
import { useDebounce } from '@/hooks/useDebounce';
import {
  GROUP_RESULT_CAP,
  PROJECT_KINDS,
  SEARCH_DEBOUNCE_MS,
  clearRecents,
  emitSearchEvent,
  pushRecentHit,
  pushRecentQuery,
  readRecents,
  useSearchInProject,
} from '@/resources/search';
import type {
  ScopeKey,
  SearchHit,
  SearchHitGroup,
  SearchResult,
  SearchSurface,
} from '@/resources/search';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type InactiveReason = 'no-project';

interface UseSearchEngineParams {
  /** null means no active project — engine returns an inactive state. */
  projectId: string | null;
  surface: SearchSurface;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

// --- Pure helpers (exported for unit testing) ---------------------------------

export function scopeKey(projectId: string | null): ScopeKey | null {
  return projectId ? `project:${projectId}` : null;
}

export function groupByKind(hits: SearchHit[]): {
  groups: SearchHitGroup[];
  hasOverflow: boolean;
} {
  const map = new Map<string, SearchHit[]>();
  for (const h of hits) {
    const arr = map.get(h.kind) ?? [];
    arr.push(h);
    map.set(h.kind, arr);
  }
  let hasOverflow = false;
  const groups: SearchHitGroup[] = [];
  for (const [kind, all] of map) {
    const capped = all.slice(0, GROUP_RESULT_CAP);
    const hasMore = all.length > GROUP_RESULT_CAP;
    if (hasMore) hasOverflow = true;
    groups.push({ kind, hits: capped, hasMore });
  }
  return { groups, hasOverflow };
}

interface StatusTextInput {
  isLoading: boolean;
  isError: boolean;
  totalHits: number;
  query: string;
  hasPartialPermission: boolean;
  inactiveReason?: InactiveReason | null;
}

export function computeStatusText(state: StatusTextInput): string {
  if (state.inactiveReason === 'no-project') return 'Open a project to search.';
  if (state.isLoading) return 'Searching…';
  if (state.isError) return 'Search is temporarily unavailable.';
  if (state.query && state.totalHits === 0) return `No results for ${state.query}.`;
  if (state.hasPartialPermission && state.totalHits > 0) {
    return `${state.totalHits} result${state.totalHits === 1 ? '' : 's'}. Some kinds hidden.`;
  }
  if (state.totalHits > 0) {
    return `${state.totalHits} result${state.totalHits === 1 ? '' : 's'}.`;
  }
  return '';
}

/**
 * Find a hit by uid across grouped results and return 1-based positions.
 * Returns `{ groupPosition: 1, globalPosition: 1 }` when the uid is absent
 * (e.g. selection from recents not present in current groups).
 */
export function getHitPosition(
  groups: SearchHitGroup[],
  uid: string
): { groupPosition: number; globalPosition: number } {
  let runningOffset = 0;
  for (const g of groups) {
    const idx = g.hits.findIndex((h) => h.uid === uid);
    if (idx >= 0) {
      return { groupPosition: idx + 1, globalPosition: runningOffset + idx + 1 };
    }
    runningOffset += g.hits.length;
  }
  return { groupPosition: 1, globalPosition: 1 };
}

// --- Hook ---------------------------------------------------------------------

export function useSearchEngine(params: UseSearchEngineParams) {
  const { projectId, surface, open, onOpenChange } = params;
  const scopeK = scopeKey(projectId);
  const inactiveReason: InactiveReason | null = projectId === null ? 'no-project' : null;

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, SEARCH_DEBOUNCE_MS);

  // Always call useSearchInProject to keep hook order stable across renders.
  // When projectId is null we pass '' + enabled: false so no network call is
  // made and the query stays in an idle state.
  const q = useSearchInProject(
    projectId ?? '',
    { query: debouncedQuery, targetResources: PROJECT_KINDS, limit: 25 },
    { enabled: projectId !== null && open && debouncedQuery.length > 0 }
  );

  const data: SearchResult | undefined = q.data;
  // Defense-in-depth: only keep hits whose tenant.name matches the active
  // project. Drops cross-tenant leaks while the server-side tenant filter for
  // /apis/search.miloapis.com/* is still being wired up. When the backend
  // filter ships, this becomes a no-op (every hit already matches).
  const filteredHits = useMemo(() => {
    if (inactiveReason || !data?.hits) return [];
    if (!projectId) return data.hits;
    return data.hits.filter((h) => h.tenant.name === projectId);
  }, [data?.hits, inactiveReason, projectId]);
  const { groups, hasOverflow } = useMemo(
    () => (inactiveReason ? { groups: [], hasOverflow: false } : groupByKind(filteredHits)),
    [filteredHits, inactiveReason]
  );
  const totalHits = inactiveReason ? 0 : filteredHits.length;
  const deniedKinds = useMemo(
    () => (inactiveReason ? [] : (data?.deniedKinds ?? [])),
    [data?.deniedKinds, inactiveReason]
  );
  const hasPartialPermission = deniedKinds.length > 0;

  // Recents are state-backed (not memoized) so clearRecents mutations to
  // localStorage trigger an immediate re-render. The previous useMemo
  // approach left the UI showing stale entries after "Clear all" until
  // the next open/close cycle, because its deps (scopeK, open) didn't
  // reflect the storage write.
  //
  // We re-read storage whenever the surface (re)opens so the starting
  // state reflects selections made in a different surface within the
  // same scope. When inactive, recents are empty (no scope key to read).
  const [recents, setRecents] = useState<{ queries: string[]; hits: SearchHit[] }>({
    queries: [],
    hits: [],
  });
  useEffect(() => {
    if (scopeK === null) {
      setRecents({ queries: [], hits: [] });
      return;
    }
    if (open) {
      setRecents(readRecents(scopeK));
    }
  }, [open, scopeK]);

  // --- Telemetry: opened (transition false -> true) ---------------------------
  const prevOpen = useRef(open);
  useEffect(() => {
    if (scopeK === null) {
      prevOpen.current = open;
      return;
    }
    if (!prevOpen.current && open) {
      emitSearchEvent('search.opened', {
        surface,
        scope: scopeK,
        hasRecents: recents.queries.length > 0 || recents.hits.length > 0,
      });
    }
    prevOpen.current = open;
  }, [open, surface, scopeK, recents.queries.length, recents.hits.length]);

  // --- Telemetry: queried -----------------------------------------------------
  // Records latency from the moment the debounced query changed to the moment
  // the React Query result settles (isLoading -> false).
  const queriedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (scopeK === null) return;
    if (!open) return;
    if (debouncedQuery.length === 0) return;
    queriedAtRef.current = Date.now();
  }, [open, debouncedQuery, scopeK]);

  useEffect(() => {
    if (scopeK === null) return;
    if (q.isLoading || queriedAtRef.current === null) return;
    if (debouncedQuery.length === 0) {
      queriedAtRef.current = null;
      return;
    }
    const latencyMs = Date.now() - queriedAtRef.current;
    queriedAtRef.current = null;
    emitSearchEvent('search.queried', {
      surface,
      scope: scopeK,
      queryLength: debouncedQuery.length,
      kindCount: PROJECT_KINDS.length,
      latencyMs,
      hitCount: totalHits,
      hadOverflow: hasOverflow,
    });

    // Auto-save the query to recents if it produced results.
    // Users can re-run queries they tried, not just ones they followed through on.
    // pushRecentQuery dedupes by trimmed string so repeated queries don't pollute history.
    if (totalHits > 0 && scopeK !== null) {
      pushRecentQuery(scopeK, debouncedQuery);
    }
  }, [q.isLoading, debouncedQuery, surface, scopeK, totalHits, hasOverflow]);

  // --- Telemetry: partial_permission (once per scope per session) -------------
  const partialEmittedRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (scopeK === null) return;
    if (!hasPartialPermission) return;
    if (partialEmittedRef.current[scopeK]) return;
    partialEmittedRef.current[scopeK] = true;
    emitSearchEvent('search.partial_permission', {
      surface,
      scope: scopeK,
      deniedKinds: deniedKinds.map((k) => `${k.group}/${k.version}/${k.kind}`),
    });
  }, [hasPartialPermission, scopeK, surface, deniedKinds]);

  // --- Telemetry: error -------------------------------------------------------
  useEffect(() => {
    if (scopeK === null) return;
    if (!q.isError) return;
    const status = (q.error as { status?: number } | null)?.status;
    emitSearchEvent('search.error', {
      surface,
      scope: scopeK,
      statusCode: typeof status === 'number' ? status : 'network',
      queryLength: debouncedQuery.length,
      kindCount: PROJECT_KINDS.length,
    });
  }, [q.isError, q.error, surface, scopeK, debouncedQuery.length]);

  // --- Telemetry: dismissed (open transition true -> false WITHOUT select) ----
  const openedAtRef = useRef<number | null>(null);
  const selectedRef = useRef(false);
  useEffect(() => {
    if (scopeK === null) return;
    if (open) {
      openedAtRef.current = Date.now();
      selectedRef.current = false;
      return;
    }
    if (openedAtRef.current !== null && !selectedRef.current) {
      emitSearchEvent('search.dismissed', {
        surface,
        scope: scopeK,
        queryLength: debouncedQuery.length,
        hitCountSeen: totalHits,
        dwellMs: Date.now() - openedAtRef.current,
      });
    }
    openedAtRef.current = null;
  }, [open, surface, scopeK, debouncedQuery.length, totalHits]);

  // --- Selection --------------------------------------------------------------
  const selectHit = useCallback(
    (hitArg: SearchHit) => {
      if (scopeK === null) {
        // Reset query first so React batches both state updates into a
        // single render — closing first leaves an intermediate frame
        // where the popover is mid-close but the old query is still
        // visible, which reads as a flicker.
        setQuery('');
        onOpenChange(false);
        return;
      }
      selectedRef.current = true;
      const { groupPosition, globalPosition } = getHitPosition(groups, hitArg.uid);
      pushRecentQuery(scopeK, debouncedQuery);
      pushRecentHit(scopeK, hitArg);
      emitSearchEvent('search.selected', {
        surface,
        scope: scopeK,
        kind: hitArg.kind,
        groupPosition,
        globalPosition,
        queryLength: debouncedQuery.length,
        selectedFrom: debouncedQuery.length === 0 ? 'recents' : 'results',
      });
      // Reset the query so re-opening the surface starts fresh on every
      // path (CmdKPalette had its own close-reset effect; ProjectSearchBar
      // and MobileSearchSheet didn't). Centralising it here means a fresh
      // input for every surface, every time. Reset BEFORE the close so
      // React batches both state changes — closing first leaves a brief
      // render frame that produced a visible flicker on the popover
      // surface during route navigation.
      setQuery('');
      onOpenChange(false);
    },
    [groups, scopeK, debouncedQuery, surface, onOpenChange]
  );

  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);

  const clearRecentsLocal = useCallback(() => {
    if (scopeK === null) return;
    clearRecents(scopeK);
    // Drop local state immediately so the UI updates without waiting for
    // a close/re-open cycle. Without this, the previous render's recents
    // stay visible until the surface next opens.
    setRecents({ queries: [], hits: [] });
  }, [scopeK]);

  // --- ARIA -------------------------------------------------------------------
  const ariaStatusText = useMemo(
    () =>
      computeStatusText({
        isLoading: q.isLoading,
        isError: q.isError,
        totalHits,
        query: debouncedQuery,
        hasPartialPermission,
        inactiveReason,
      }),
    [q.isLoading, q.isError, totalHits, debouncedQuery, hasPartialPermission, inactiveReason]
  );

  const listboxId = useMemo(() => `search-listbox-${surface}`, [surface]);

  const comboboxProps = useMemo(
    () => ({
      role: 'combobox' as const,
      'aria-controls': listboxId,
      'aria-expanded': open,
    }),
    [listboxId, open]
  );

  const listboxProps = useMemo(
    () => ({
      role: 'listbox' as const,
      id: listboxId,
    }),
    [listboxId]
  );

  return {
    // Query state
    query,
    setQuery,
    debouncedQuery,

    // Result state
    isLoading: inactiveReason ? false : q.isLoading,
    isError: inactiveReason ? false : q.isError,
    error: inactiveReason ? null : ((q.error as Error | null) ?? null),
    groups,
    totalHits,
    hasOverflow,

    // Inactive state
    inactiveReason,

    // Recents
    recentQueries: recents.queries,
    recentHits: recents.hits,

    // Permission
    deniedKinds,
    hasPartialPermission,

    // ARIA
    ariaStatusText,
    comboboxProps,
    listboxProps,

    // Actions
    selectHit,
    dismiss,
    clearRecents: clearRecentsLocal,
    refetch: q.refetch,
  };
}
