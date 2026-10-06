// Optimistic mutation handlers for list resources, spread into `useMutation`.
// Row UI state lives in the sync-state store, never on the object.
import {
  removeResource,
  snapshotRow,
  upsertResource,
  type CacheItemMeta,
  type ResourceKeys,
  type RowSnapshot,
} from './resource-cache';
import {
  PENDING_NAME_PREFIX,
  isPendingSyncState,
  syncKey,
  syncState,
  type RowSyncState,
} from './sync-state';
import {
  matchQuery,
  type QueryClient,
  type QueryKey,
  type UseMutationOptions,
} from '@tanstack/react-query';

/** A pending delete whose DELETED event never came is rechecked after this long. */
export const PENDING_DELETE_RECHECK_MS = 30_000;
export { PENDING_NAME_PREFIX };

export type MutationCtx = { key: string; name: string; op: 'create' | 'update' | 'delete' };

export type MutationHandlers<T, V> = Pick<
  UseMutationOptions<T, Error, V, MutationCtx>,
  'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
>;

export interface ResourceMutationsConfig<T> {
  /** Sync-state kind; the list's `getRowSyncKey` and watch `syncKind` use the same one. */
  kind: string;
  /** Project or org id the lists belong to (`ACCOUNT_SYNC_SCOPE` for the user's own). */
  scope: string;
  keys: ResourceKeys;
  getName: (item: T) => string;
  getMeta: (item: T) => CacheItemMeta;
  /** A query is updated by the watch or invalidated by mutations, never both. */
  watched: boolean;
  mapError?: (error: unknown) => string;
  report?: (message: string, error: unknown) => void;
}

/**
 * Overlapping mutations on one row: the row shows pending until the last one
 * ends, a delete wins, and a failure rolls back only when none succeeded.
 */
interface RowChain {
  inFlight: number;
  deletes: number;
  /** A delete went through; the row shows "Deleting…" until it leaves the list. */
  deleted: boolean;
  succeeded: boolean;
  state?: 'pending-create' | 'pending-update';
  /** The row before the chain's first optimistic write. */
  base?: RowSnapshot;
  written?: { resourceVersion?: string };
}

const chains = new Map<string, RowChain>();
let pendingNameSeq = 0;

const shownState = (chain: RowChain): RowSyncState | undefined =>
  chain.deletes > 0 || chain.deleted ? 'pending-delete' : chain.state;

/** Exported for mutations that share these rows without `defineResourceMutations`. */
export function beginRowPending(key: string, state: RowSyncState): RowChain {
  const chain = chains.get(key) ?? { inFlight: 0, deletes: 0, deleted: false, succeeded: false };
  // "Deleting…" with no delete in flight means an earlier delete went through.
  if (chain.deletes === 0 && syncState.get(key) === 'pending-delete') chain.deleted = true;
  chain.inFlight += 1;
  if (state === 'pending-delete') chain.deletes += 1;
  if (state === 'pending-create' || state === 'pending-update') chain.state = state;
  chains.set(key, chain);
  syncState.set(key, shownState(chain) ?? state);
  return chain;
}

/** Returns the chain when this was its last mutation. */
export function endRowPending(
  key: string,
  outcome: { ok: boolean; delete?: boolean }
): RowChain | undefined {
  const chain = chains.get(key);
  if (!chain) return undefined;
  chain.inFlight -= 1;
  if (outcome.ok) chain.succeeded = true;
  if (outcome.delete) {
    chain.deletes -= 1;
    if (outcome.ok) chain.deleted = true;
  }

  const current = syncState.get(key);
  if (chain.inFlight > 0) {
    const shown = shownState(chain);
    if (shown && shown !== current && isPendingSyncState(current)) syncState.set(key, shown);
    return undefined;
  }

  chains.delete(key);
  // "Deleting…" stays until the row leaves the list: finalizers can hold it.
  if (!chain.deleted && isPendingSyncState(current)) syncState.clear(key);
  return chain;
}

function findListed(
  qc: QueryClient,
  lists: QueryKey,
  name: string,
  getName: (item: unknown) => string
): { listed: boolean; found: boolean } {
  let listed = false;
  let found = false;
  for (const [, data] of qc.getQueriesData({ queryKey: lists })) {
    const rows = Array.isArray(data) ? data : (data as { items?: unknown } | undefined)?.items;
    if (!Array.isArray(rows)) continue;
    listed = true;
    if (rows.some((row) => getName(row) === name)) found = true;
  }
  return { listed, found };
}

// A mounted page whose query is removed refetches it, showing a 404 for a
// deleted object while it navigates away; so wait until nothing observes it.
function removeWhenUnobserved(qc: QueryClient, queryKey: QueryKey): void {
  const cache = qc.getQueryCache();
  const query = cache.find({ queryKey, exact: true });
  if (!query) return;
  if (query.getObserversCount() === 0) {
    qc.removeQueries({ queryKey, exact: true });
    return;
  }
  const unsubscribe = cache.subscribe((event) => {
    if (event.query !== query) return;
    if (event.type === 'removed') {
      unsubscribe();
    } else if (event.type === 'observerRemoved' && query.getObserversCount() === 0) {
      unsubscribe();
      qc.removeQueries({ queryKey, exact: true });
    }
  });
}

const defaultMapError = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong';

export function defineResourceMutations<T>(cfg: ResourceMutationsConfig<T>) {
  const keyOf = (name: string) => syncKey(cfg.kind, cfg.scope, name);
  const listsOnly: ResourceKeys = { lists: cfg.keys.lists };
  const getName = (item: unknown) => cfg.getMeta(item as T).name;
  const getVersion = (item: unknown) => cfg.getMeta(item as T).resourceVersion;

  const fail = (error: unknown, ctx: MutationCtx | undefined) => {
    if (ctx?.key) {
      const ended = endRowPending(ctx.key, { ok: false, delete: ctx.op === 'delete' });
      if (ended && !ended.succeeded) ended.base?.rollback(ended.written);
    }
    cfg.report?.((cfg.mapError ?? defaultMapError)(error), error);
  };

  const settle = (qc: QueryClient, ctx: MutationCtx | undefined, deleted = false) => {
    if (cfg.watched) return;
    void qc.invalidateQueries({ queryKey: cfg.keys.lists });
    if (!deleted && ctx?.name && cfg.keys.detail) {
      void qc.invalidateQueries({ queryKey: cfg.keys.detail(ctx.name) });
    }
  };

  // List fetches in flight are cancelled so a late response cannot overwrite the row.
  const applyOptimistic = async (
    qc: QueryClient,
    optimistic: T,
    state: RowSyncState,
    keys: ResourceKeys
  ): Promise<MutationCtx> => {
    const name = cfg.getName(optimistic);
    const cancelled = qc
      .getQueryCache()
      .findAll({ queryKey: cfg.keys.lists, fetchStatus: 'fetching' })
      .map((query) => query.queryKey);
    await qc.cancelQueries({ queryKey: cfg.keys.lists });
    const key = keyOf(name);
    const base = chains.get(key)?.base ?? snapshotRow(qc, keys, name, getName, getVersion);
    upsertResource(qc, keys, optimistic, { origin: 'optimistic', getMeta: cfg.getMeta });
    const chain = beginRowPending(key, state);
    chain.base = base;
    chain.written = { resourceVersion: getVersion(optimistic) };
    // The write marks the lists fresh, but a fetch it cancelled still has to happen.
    for (const queryKey of cancelled) {
      void qc.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
    }
    return { key, name, op: state === 'pending-create' ? 'create' : 'update' };
  };

  const applyServer = (qc: QueryClient, data: T, ctx: MutationCtx) => {
    if (ctx.name && cfg.getName(data) !== ctx.name) {
      removeResource(qc, listsOnly, ctx.name, { getName });
    }
    upsertResource(qc, cfg.keys, data, { origin: 'server', getMeta: cfg.getMeta });
    if (ctx.key) endRowPending(ctx.key, { ok: true });
  };

  // Waits for DELETED or a list without the row. After 30s (event lost, or
  // finalizers still running) refetch the lists once and stop showing it.
  const awaitDeletedRow = (qc: QueryClient, key: string, name: string) => {
    const settled = () => {
      if (syncState.get(key) !== 'pending-delete') return true;
      const { listed, found } = findListed(qc, cfg.keys.lists, name, getName);
      if (!listed || found) return false;
      syncState.clear(key);
      return true;
    };
    if (settled()) return;

    const unsubscribe = qc.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || !matchQuery({ queryKey: cfg.keys.lists }, event.query)) {
        return;
      }
      if (settled()) unsubscribe();
    });

    setTimeout(() => {
      unsubscribe();
      if (syncState.get(key) !== 'pending-delete') return;
      void qc.invalidateQueries({ queryKey: cfg.keys.lists }).finally(() => {
        if (syncState.get(key) === 'pending-delete') syncState.clear(key);
      });
    }, PENDING_DELETE_RECHECK_MS);
  };

  return {
    /** When the server picks the name, use `pendingName` as the row's name. */
    create<V>(toOptimistic: (vars: V, pendingName: string) => T): MutationHandlers<T, V> {
      return {
        onMutate: (vars, { client }) => {
          pendingNameSeq += 1;
          const optimistic = toOptimistic(vars, `${PENDING_NAME_PREFIX}${pendingNameSeq}`);
          return applyOptimistic(client, optimistic, 'pending-create', listsOnly);
        },
        onSuccess: (data, _vars, ctx, { client }) => applyServer(client, data, ctx),
        onError: (error, _vars, ctx) => fail(error, ctx),
        onSettled: (_data, _error, _vars, ctx, { client }) => settle(client, ctx),
      };
    },

    /** Return undefined from `toOptimistic` when nothing is cached. */
    update<V>(toOptimistic: (vars: V) => T | undefined): MutationHandlers<T, V> {
      return {
        onMutate: (vars, { client }) => {
          const optimistic = toOptimistic(vars);
          if (optimistic === undefined) return { key: '', name: '', op: 'update' };
          return applyOptimistic(client, optimistic, 'pending-update', cfg.keys);
        },
        onSuccess: (data, _vars, ctx, { client }) => applyServer(client, data, ctx),
        onError: (error, _vars, ctx) => fail(error, ctx),
        onSettled: (_data, _error, _vars, ctx, { client }) => settle(client, ctx),
      };
    },

    /**
     * The row stays as "Deleting…" until it is confirmed gone: removing it at
     * once would let a refetch during finalization bring it back.
     */
    remove<V>(getNameFromVars: (vars: V) => string): MutationHandlers<void, V> {
      return {
        onMutate: (vars) => {
          const name = getNameFromVars(vars);
          const key = keyOf(name);
          beginRowPending(key, 'pending-delete');
          return { key, name, op: 'delete' };
        },
        onSuccess: async (_data, _vars, ctx, { client }) => {
          endRowPending(ctx.key, { ok: true, delete: true });
          if (cfg.watched) {
            const detailKey = cfg.keys.detail?.(ctx.name);
            if (detailKey) await client.cancelQueries({ queryKey: detailKey, exact: true });
            awaitDeletedRow(client, ctx.key, ctx.name);
          } else {
            syncState.markRemoving(ctx.key, () =>
              removeResource(client, cfg.keys, ctx.name, { getName })
            );
          }
        },
        onError: (error, _vars, ctx) => fail(error, ctx),
        onSettled: (_data, error, _vars, ctx, { client }) => {
          const detailKey = ctx?.name ? cfg.keys.detail?.(ctx.name) : undefined;
          if (!error && cfg.watched && detailKey) removeWhenUnobserved(client, detailKey);
          settle(client, ctx, !error);
        },
      };
    },
  };
}

type CallbackName = 'onMutate' | 'onSuccess' | 'onError' | 'onSettled';

/**
 * Resource handlers run before the caller's. If the caller's onMutate throws,
 * TanStack calls onError without a context, so the resource onError runs
 * there with the row's context and is skipped on TanStack's call.
 */
export function withResourceHandlers<T, V, O extends UseMutationOptions<T, Error, V>>(
  handlers: MutationHandlers<T, V>,
  options?: O
): Omit<O, CallbackName> & MutationHandlers<T, V> {
  const { onMutate, onSuccess, onError, onSettled, ...rest } = options ?? ({} as O);
  const failedInMutate = new Set<unknown>();
  return {
    ...rest,
    onMutate: async (vars, context) => {
      const ctx = (await handlers.onMutate?.(vars, context)) as MutationCtx;
      try {
        await onMutate?.(vars, context);
      } catch (error) {
        failedInMutate.add(error);
        await handlers.onError?.(error as Error, vars, ctx, context);
        throw error;
      }
      return ctx;
    },
    onSuccess: async (...args) => {
      await handlers.onSuccess?.(...args);
      await onSuccess?.(...args);
    },
    onError: async (...args) => {
      if (!failedInMutate.delete(args[0])) await handlers.onError?.(...args);
      await onError?.(...args);
    },
    onSettled: async (...args) => {
      await handlers.onSettled?.(...args);
      await onSettled?.(...args);
    },
  };
}
