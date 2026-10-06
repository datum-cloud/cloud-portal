// Turns one watch event into a cache write; free of React so it tests with a plain QueryClient.
import {
  isGone,
  isNewerOrEqual,
  keepingInvalidation,
  removeResource,
  upsertResource,
  type CacheItemMeta,
} from './resource-cache';
import { PENDING_NAME_PREFIX, syncKey, syncState } from './sync-state';
import type { WatchEvent } from './watch.types';
import { hashKey, type Query, type QueryClient, type QueryKey } from '@tanstack/react-query';

export interface WatchCacheConfig<T> {
  queryKey: QueryKey;
  isDetail: boolean;
  getItemKey?: (item: T) => string;
  getMeta?: (item: T) => CacheItemMeta;
  updateListCache?: (old: unknown, item: T) => unknown;
  updateSingleCache?: (old: T | undefined, item: T) => T;
  /** List events for items this returns false for are dropped, so they never reach the list. */
  accepts?: (item: T) => boolean;
  /** Lists this watch mirrors events into; a resync refetches them too. */
  mirroredKeys?: () => readonly QueryKey[];
  /** When set, a change made elsewhere flashes the row and a deleted row fades out. */
  syncKind?: string;
  syncScope?: string;
}

/** `invalidate`: a list with no item key, which the caller invalidates, throttled. */
export type WatchEventResult = 'written' | 'invalidate' | 'ignored';

type MetaSource = {
  resourceVersion?: string;
  deletionTimestamp?: string | Date;
  metadata?: { resourceVersion?: string; deletionTimestamp?: string | Date };
};

function defaultMeta<T>(item: T, getItemKey?: (item: T) => string): CacheItemMeta {
  const source = (item ?? {}) as MetaSource;
  return {
    name: getItemKey ? getItemKey(item) : '',
    resourceVersion: source.metadata?.resourceVersion ?? source.resourceVersion,
    deletionTimestamp: source.metadata?.deletionTimestamp ?? source.deletionTimestamp,
  };
}

function metaReader<T>(cfg: WatchCacheConfig<T>): (item: T) => CacheItemMeta {
  return cfg.getMeta ?? ((item) => defaultMeta(item, cfg.getItemKey));
}

type ResyncScheduler = { schedule(queryKey: QueryKey, isDetail: boolean): void };

const schedulers = new WeakMap<QueryClient, ResyncScheduler>();

function resyncSchedulerFor(qc: QueryClient): ResyncScheduler {
  const existing = schedulers.get(qc);
  if (existing) return existing;
  const scheduler = createResyncScheduler(qc);
  schedulers.set(qc, scheduler);
  return scheduler;
}

// Batched per microtask: a reconnect fans RESYNC out to every channel, and
// several channels can share a key, so each key refetches once.
export function createResyncScheduler(qc: QueryClient): ResyncScheduler {
  let pending = new Map<string, { queryKey: QueryKey; isDetail: boolean }>();

  const flush = () => {
    const batch = pending;
    pending = new Map();
    for (const { queryKey, isDetail } of batch.values()) {
      if (isDetail) {
        void qc.refetchQueries({ queryKey });
      } else {
        void qc.invalidateQueries({ queryKey });
      }
    }
  };

  return {
    schedule(queryKey, isDetail) {
      if (pending.size === 0) queueMicrotask(flush);
      pending.set(hashKey(queryKey), { queryKey, isDetail });
    },
  };
}

function applyDetailEvent<T>(
  qc: QueryClient,
  cfg: WatchCacheConfig<T>,
  event: WatchEvent<T>
): WatchEventResult {
  if (event.type === 'DELETED') {
    qc.removeQueries({ queryKey: cfg.queryKey });
    return 'written';
  }
  const getMeta = metaReader(cfg);
  const { resourceVersion } = getMeta(event.object);
  keepingInvalidation(qc, { queryKey: cfg.queryKey, exact: true }, () =>
    qc.setQueryData(cfg.queryKey, (current: T | undefined) => {
      if (
        current !== undefined &&
        !isNewerOrEqual(resourceVersion, getMeta(current).resourceVersion)
      ) {
        return current;
      }
      return cfg.updateSingleCache ? cfg.updateSingleCache(current, event.object) : event.object;
    })
  );
  return 'written';
}

function findCachedRows<T>(
  qc: QueryClient,
  listKey: QueryKey,
  name: string,
  getMeta: (item: T) => CacheItemMeta
): { listed: boolean; rows: T[] } {
  let listed = false;
  const rows: T[] = [];
  for (const [, data] of qc.getQueriesData({ queryKey: listKey })) {
    const items = Array.isArray(data) ? data : (data as { items?: unknown } | undefined)?.items;
    if (!Array.isArray(items)) continue;
    listed = true;
    for (const row of items) {
      if (getMeta(row as T).name === name) rows.push(row as T);
    }
  }
  return { listed, rows };
}

// The rv=0 ADDED replay on every subscribe is not a change and must not flash every row.
function isVisibleChange<T>(
  event: WatchEvent<T>,
  cached: { listed: boolean; rows: T[] },
  meta: CacheItemMeta,
  getMeta: (item: T) => CacheItemMeta
): boolean {
  if (!cached.listed) return false;
  // A MODIFIED for a row the list leaves out (terminating DNS zones) is not new.
  if (cached.rows.length === 0) return event.type === 'ADDED';
  return cached.rows.some((row) => {
    const current = getMeta(row).resourceVersion;
    // Without versions there is no telling a replay from a change, so do not flash.
    if (current === meta.resourceVersion) return false;
    return isNewerOrEqual(meta.resourceVersion, current);
  });
}

/** Server and browser clocks rarely agree to the second. */
export const CREATE_CLOCK_SKEW_MS = 30_000;

type CreatedSource = {
  createdAt?: unknown;
  creationTimestamp?: unknown;
  metadata?: { creationTimestamp?: unknown };
};

function createdAtOf(item: unknown): number | undefined {
  if (typeof item !== 'object' || item === null) return undefined;
  const source = item as CreatedSource;
  const value = source.metadata?.creationTimestamp ?? source.creationTimestamp ?? source.createdAt;
  if (!(typeof value === 'string' || value instanceof Date)) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function pendingSeq(name: string): number | undefined {
  if (!name.startsWith(PENDING_NAME_PREFIX)) return undefined;
  const seq = Number(name.slice(PENDING_NAME_PREFIX.length));
  return Number.isInteger(seq) ? seq : undefined;
}

function couldBeCreatedBy(key: string, createdAt: number | undefined): boolean {
  if (syncState.get(key) !== 'pending-create') return false;
  const since = syncState.pendingSince(key);
  return (
    createdAt === undefined || since === undefined || createdAt >= since - CREATE_CLOCK_SKEW_MS
  );
}

// When the server names the object, its ADDED usually arrives before the POST response.
function oldestPendingCreate<T>(
  qc: QueryClient,
  cfg: { queryKey: QueryKey; kind: string; scope: string; createdAt?: number },
  getMeta: (item: T) => CacheItemMeta
): string | undefined {
  let oldest: { name: string; seq: number } | undefined;
  for (const [, data] of qc.getQueriesData({ queryKey: cfg.queryKey })) {
    const items = Array.isArray(data) ? data : (data as { items?: unknown } | undefined)?.items;
    if (!Array.isArray(items)) continue;
    for (const row of items) {
      const { name } = getMeta(row as T);
      const seq = pendingSeq(name);
      if (seq === undefined || (oldest && oldest.seq <= seq)) continue;
      if (!couldBeCreatedBy(syncKey(cfg.kind, cfg.scope, name), cfg.createdAt)) continue;
      oldest = { name, seq };
    }
  }
  return oldest?.name;
}

// A new name while the list shows a temporary create row is most likely that
// create, so it replaces the row instead of flashing.
function markIncomingRow<T>(
  qc: QueryClient,
  cfg: WatchCacheConfig<T>,
  event: WatchEvent<T>,
  meta: CacheItemMeta,
  getMeta: (item: T) => CacheItemMeta
): void {
  const { syncKind: kind, syncScope: scope } = cfg;
  if (!kind || !scope) return;
  const key = syncKey(kind, scope, meta.name);
  const cached = findCachedRows(qc, cfg.queryKey, meta.name, getMeta);

  const replacing =
    event.type === 'ADDED' && cached.listed && cached.rows.length === 0
      ? oldestPendingCreate(
          qc,
          { queryKey: cfg.queryKey, kind, scope, createdAt: createdAtOf(event.object) },
          getMeta
        )
      : undefined;
  if (replacing) {
    removeResource(qc, { lists: cfg.queryKey }, replacing, {
      getName: (item) => getMeta(item as T).name,
    });
  } else if (!syncState.recentlyMutated(key) && isVisibleChange(event, cached, meta, getMeta)) {
    syncState.flashChanged(key);
  }
}

function removeListRow<T>(
  qc: QueryClient,
  cfg: WatchCacheConfig<T>,
  name: string,
  getMeta: (item: T) => CacheItemMeta
): void {
  const remove = () =>
    removeResource(qc, { lists: cfg.queryKey }, name, {
      getName: (item) => getMeta(item as T).name,
    });
  const { syncKind: kind, syncScope: scope } = cfg;
  if (kind && scope && findCachedRows(qc, cfg.queryKey, name, getMeta).rows.length > 0) {
    syncState.markRemoving(syncKey(kind, scope, name), remove);
  } else {
    remove();
  }
}

function applyListEvent<T>(
  qc: QueryClient,
  cfg: WatchCacheConfig<T>,
  event: WatchEvent<T>
): WatchEventResult {
  if (cfg.accepts && !cfg.accepts(event.object)) return 'ignored';
  if (!cfg.getItemKey && !cfg.getMeta) return 'invalidate';

  const getMeta = metaReader(cfg);
  const meta = getMeta(event.object);

  if (event.type === 'DELETED' || isGone(meta)) {
    removeListRow(qc, cfg, meta.name, getMeta);
    return 'written';
  }

  markIncomingRow(qc, cfg, event, meta, getMeta);

  if (event.type === 'MODIFIED' && cfg.updateListCache) {
    const update = cfg.updateListCache;
    keepingInvalidation(qc, { queryKey: cfg.queryKey }, () =>
      qc.setQueriesData({ queryKey: cfg.queryKey }, (old: unknown) =>
        old === undefined ? old : update(old, event.object)
      )
    );
    return 'written';
  }

  upsertResource(qc, { lists: cfg.queryKey }, event.object, { origin: 'watch', getMeta });
  return 'written';
}

const refetchOnSettle = new WeakSet<Query>();

/**
 * A fetch in flight read the server before the watch write, so refetch once it
 * settles. A cancelled or failed one is only marked stale: its canceller owns the next write.
 */
function refetchWhenSettled(qc: QueryClient, query: Query): void {
  if (refetchOnSettle.has(query)) return;
  refetchOnSettle.add(query);
  const cache = qc.getQueryCache();
  const unsubscribe = cache.subscribe((event) => {
    if (event.query !== query) return;
    if (event.type === 'removed') {
      refetchOnSettle.delete(query);
      unsubscribe();
      return;
    }
    if (event.type !== 'updated' || query.state.fetchStatus !== 'idle') return;
    refetchOnSettle.delete(query);
    unsubscribe();
    const refetch = event.action.type === 'success';
    void qc.invalidateQueries({
      queryKey: query.queryKey,
      exact: true,
      refetchType: refetch ? 'active' : 'none',
    });
  });
}

function guardAgainstInFlightFetches(qc: QueryClient, queryKey: QueryKey, exact: boolean): void {
  for (const query of qc.getQueryCache().findAll({ queryKey, exact, fetchStatus: 'fetching' })) {
    refetchWhenSettled(qc, query);
  }
}

export function applyWatchEvent<T>(
  qc: QueryClient,
  cfg: WatchCacheConfig<T>,
  event: WatchEvent<T>
): WatchEventResult {
  switch (event.type) {
    case 'BOOKMARK':
      return 'ignored';
    case 'ERROR':
    case 'RESYNC': {
      const scheduler = resyncSchedulerFor(qc);
      scheduler.schedule(cfg.queryKey, cfg.isDetail);
      for (const key of cfg.mirroredKeys?.() ?? []) scheduler.schedule(key, false);
      return 'ignored';
    }
    case 'ADDED':
    case 'MODIFIED':
    case 'DELETED': {
      const result = cfg.isDetail
        ? applyDetailEvent(qc, cfg, event)
        : applyListEvent(qc, cfg, event);
      if (result === 'written') guardAgainstInFlightFetches(qc, cfg.queryKey, cfg.isDetail);
      return result;
    }
  }
}
