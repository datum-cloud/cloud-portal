// The one writer of resource caches, for watch events and mutations alike: an
// older resourceVersion never overwrites a newer row.
import { hashKey, type QueryClient, type QueryFilters, type QueryKey } from '@tanstack/react-query';

export type ResourceKeys = { lists: QueryKey; detail?: (name: string) => QueryKey };

export type CacheOrigin = 'optimistic' | 'server' | 'watch';

export interface CacheItemMeta {
  name: string;
  resourceVersion?: string;
  deletionTimestamp?: string | Date;
  /** Still exists but left its lists (an accepted invitation); treated like a deletionTimestamp. */
  removed?: boolean;
}

export function isGone(meta: CacheItemMeta): boolean {
  return Boolean(meta.deletionTimestamp) || meta.removed === true;
}

const DIGITS = /^\d+$/;

/**
 * resourceVersions exceed 2^53, so digit strings compare as BigInt. Anything else
 * is accepted, which lets a server object replace an optimistic row.
 */
export function isNewerOrEqual(next?: string, current?: string): boolean {
  if (!next || !current || !DIGITS.test(next) || !DIGITS.test(current)) return true;
  return BigInt(next) >= BigInt(current);
}

/**
 * TanStack's setQueryData clears isInvalidated, so a list invalidated while no
 * watch was mounted would be served stale on return. Re-mark it after the write.
 */
export function keepingInvalidation(qc: QueryClient, filters: QueryFilters, write: () => void) {
  const invalidated = qc
    .getQueryCache()
    .findAll(filters)
    .filter((query) => query.state.isInvalidated)
    .map((query) => query.queryKey);

  write();

  for (const queryKey of invalidated) {
    void qc.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
  }
}

type ItemsList = { items: unknown[] };

function isItemsList(data: unknown): data is ItemsList {
  return typeof data === 'object' && data !== null && Array.isArray((data as ItemsList).items);
}

function mapListRows(data: unknown, fn: (rows: unknown[]) => unknown[]): unknown {
  if (Array.isArray(data)) return fn(data);
  if (isItemsList(data)) return { ...data, items: fn(data.items) };
  return data;
}

function upsertRow<T>(
  rows: unknown[],
  item: T,
  meta: CacheItemMeta,
  getMeta: (item: T) => CacheItemMeta
): unknown[] {
  const index = rows.findIndex((row) => getMeta(row as T).name === meta.name);
  if (index === -1) return [...rows, item];
  const current = getMeta(rows[index] as T);
  if (!isNewerOrEqual(meta.resourceVersion, current.resourceVersion)) return rows;
  return rows.map((row, i) => (i === index ? item : row));
}

/** Uncached lists stay uncached. */
export function upsertResource<T>(
  qc: QueryClient,
  keys: ResourceKeys,
  item: T,
  opts: { origin: CacheOrigin; getMeta: (item: T) => CacheItemMeta }
): void {
  const meta = opts.getMeta(item);
  if (isGone(meta)) {
    removeResource(qc, keys, meta.name, { getName: (row) => opts.getMeta(row as T).name });
    return;
  }

  keepingInvalidation(qc, { queryKey: keys.lists }, () =>
    qc.setQueriesData({ queryKey: keys.lists }, (data: unknown) =>
      mapListRows(data, (rows) => upsertRow(rows, item, meta, opts.getMeta))
    )
  );

  if (keys.detail) {
    const detailKey = keys.detail(meta.name);
    keepingInvalidation(qc, { queryKey: detailKey, exact: true }, () =>
      qc.setQueryData(detailKey, (current: T | undefined) => {
        if (current === undefined) return item;
        const currentMeta = opts.getMeta(current);
        return isNewerOrEqual(meta.resourceVersion, currentMeta.resourceVersion) ? item : current;
      })
    );
  }
}

export function removeResource(
  qc: QueryClient,
  keys: ResourceKeys,
  name: string,
  opts: { getName: (item: unknown) => string }
): void {
  keepingInvalidation(qc, { queryKey: keys.lists }, () =>
    qc.setQueriesData({ queryKey: keys.lists }, (data: unknown) =>
      mapListRows(data, (rows) => rows.filter((row) => opts.getName(row) !== name))
    )
  );

  if (keys.detail) {
    qc.removeQueries({ queryKey: keys.detail(name), exact: true });
  }
}

export function snapshotResource(
  qc: QueryClient,
  keys: ResourceKeys,
  name?: string
): { rollback(): void } {
  const lists = qc.getQueriesData({ queryKey: keys.lists });
  const detailKey = name !== undefined && keys.detail ? keys.detail(name) : undefined;
  const detail = detailKey ? qc.getQueryData(detailKey) : undefined;

  const restore = (queryKey: QueryKey, data: unknown) =>
    keepingInvalidation(qc, { queryKey, exact: true }, () => qc.setQueryData(queryKey, data));

  return {
    rollback() {
      for (const [queryKey, data] of lists) {
        restore(queryKey, data);
      }
      if (!detailKey) return;
      if (detail === undefined) {
        qc.removeQueries({ queryKey: detailKey, exact: true });
      } else {
        restore(detailKey, detail);
      }
    },
  };
}

// An optimistic create has no version, so any row carrying one is newer.
function isNewerThanWritten(current: string | undefined, written: string | undefined): boolean {
  if (current === undefined) return false;
  if (written === undefined) return true;
  return !isNewerOrEqual(written, current);
}

type Guard = (row: unknown) => boolean;

export interface RowSnapshot {
  /** With `written`, a row replaced by a newer version since is left alone. */
  rollback(written?: { resourceVersion?: string }): void;
}

/** Unlike a whole-list snapshot, rows the watch wrote in the meantime survive rollback. */
export function snapshotRow(
  qc: QueryClient,
  keys: ResourceKeys,
  name: string,
  getName: (item: unknown) => string,
  getVersion: (item: unknown) => string | undefined = () => undefined
): RowSnapshot {
  const rows = new Map<string, unknown>();
  for (const [queryKey, data] of qc.getQueriesData({ queryKey: keys.lists })) {
    const list = Array.isArray(data) ? data : isItemsList(data) ? data.items : undefined;
    if (!list) continue;
    rows.set(
      hashKey(queryKey),
      list.find((row) => getName(row) === name)
    );
  }
  const detailKey = keys.detail?.(name);
  const detail = detailKey ? qc.getQueryData(detailKey) : undefined;

  const restoreRow = (rowsNow: unknown[], before: unknown, isNewer: Guard): unknown[] => {
    const index = rowsNow.findIndex((row) => getName(row) === name);
    if (index !== -1 && isNewer(rowsNow[index])) return rowsNow;
    if (before === undefined) return index === -1 ? rowsNow : rowsNow.filter((_, i) => i !== index);
    if (index === -1) return [...rowsNow, before];
    return rowsNow.map((row, i) => (i === index ? before : row));
  };

  return {
    rollback(written) {
      const isNewer: Guard = written
        ? (row) => isNewerThanWritten(getVersion(row), written.resourceVersion)
        : () => false;
      for (const query of qc.getQueryCache().findAll({ queryKey: keys.lists })) {
        const hash = hashKey(query.queryKey);
        if (!rows.has(hash)) continue;
        const before = rows.get(hash);
        keepingInvalidation(qc, { queryKey: query.queryKey, exact: true }, () =>
          qc.setQueryData(query.queryKey, (data: unknown) =>
            mapListRows(data, (rowsNow) => restoreRow(rowsNow, before, isNewer))
          )
        );
      }
      if (!detailKey) return;
      const detailNow = qc.getQueryData(detailKey);
      if (detailNow !== undefined && isNewer(detailNow)) return;
      if (detail === undefined) {
        qc.removeQueries({ queryKey: detailKey, exact: true });
      } else {
        keepingInvalidation(qc, { queryKey: detailKey, exact: true }, () =>
          qc.setQueryData(detailKey, detail)
        );
      }
    },
  };
}

export interface CacheEffects<T> {
  created(qc: QueryClient, scope: string, item: T): void;
  updated(qc: QueryClient, scope: string, item: T): void;
  deleted(qc: QueryClient, scope: string, name: string): Promise<void>;
}

/**
 * Writes the server response itself, since the watch may not be mounted, but
 * never invalidates: a query is updated by the watch or invalidated, never both.
 */
export function defineCacheEffects<T>(cfg: {
  keys: (scope: string) => ResourceKeys;
  getMeta: (item: T) => CacheItemMeta;
}): CacheEffects<T> {
  const write = (qc: QueryClient, scope: string, item: T) =>
    upsertResource(qc, cfg.keys(scope), item, { origin: 'server', getMeta: cfg.getMeta });

  return {
    created: write,
    updated: write,
    async deleted(qc, scope, name) {
      const keys = cfg.keys(scope);
      // Cancel first so a late response cannot bring the row back.
      await Promise.all([
        qc.cancelQueries({ queryKey: keys.lists }),
        keys.detail ? qc.cancelQueries({ queryKey: keys.detail(name) }) : undefined,
      ]);
      removeResource(qc, keys, name, { getName: (item) => cfg.getMeta(item as T).name });
    },
  };
}
