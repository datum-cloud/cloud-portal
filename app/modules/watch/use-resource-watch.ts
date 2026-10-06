// app/modules/watch/use-resource-watch.ts
import { applyWatchEvent, type WatchCacheConfig } from './watch-cache-handler';
import { useWatchManager } from './watch.context';
import type { WatchEvent, UseResourceWatchOptions, WatchOptions } from './watch.types';
import { addBreadcrumb } from '@/modules/sentry/capture';
import { hashKey, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

// Default configuration values
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_THROTTLE_MS = 1000;

// Watchers are ref-counted per query key: the last one to stop marks the key unwatched.
const watchedKeys = new WeakMap<QueryClient, Map<string, number>>();

function watchCounts(qc: QueryClient): Map<string, number> {
  let counts = watchedKeys.get(qc);
  if (!counts) {
    counts = new Map();
    watchedKeys.set(qc, counts);
  }
  return counts;
}

/** The returned release returns true when it was the last watcher. */
function retainWatchedKey(qc: QueryClient, queryKey: QueryKey): () => boolean {
  const counts = watchCounts(qc);
  const hash = hashKey(queryKey);
  counts.set(hash, (counts.get(hash) ?? 0) + 1);
  return () => {
    const left = (counts.get(hash) ?? 1) - 1;
    if (left > 0) {
      counts.set(hash, left);
      return false;
    }
    counts.delete(hash);
    return true;
  };
}

/** A watched query is fresh only while it is watched. */
function markUnwatched(qc: QueryClient, queryKey: QueryKey, exact: boolean): void {
  const counts = watchCounts(qc);
  void qc.invalidateQueries({
    queryKey,
    exact,
    refetchType: 'none',
    predicate: (query) => !counts.has(query.queryHash),
  });
}

/** Trailing-edge, so the last event of a burst is always followed by an invalidate. */
function createInvalidateThrottle(
  qc: QueryClient,
  queryKey: QueryKey,
  timings: () => { debounceMs: number; throttleMs: number }
): { request(): void; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastInvalidateAt = 0;
  return {
    request() {
      if (timer) return;
      const { debounceMs, throttleMs } = timings();
      const wait = Math.max(debounceMs, throttleMs - (Date.now() - lastInvalidateAt));
      timer = setTimeout(() => {
        timer = null;
        lastInvalidateAt = Date.now();
        void qc.invalidateQueries({ queryKey });
      }, wait);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

function toTypedEvent<T>(event: WatchEvent, transform?: (item: unknown) => T): WatchEvent<T> {
  const isObjectEvent =
    event.type === 'ADDED' || event.type === 'MODIFIED' || event.type === 'DELETED';
  return {
    type: event.type,
    object: isObjectEvent && transform ? transform(event.object) : (event.object as T),
  };
}

/**
 * Hook to subscribe to K8s Watch API and update React Query cache.
 *
 * A RESYNC or ERROR refetches even when `onEvent` writes the cache itself.
 *
 * @example
 * ```tsx
 * // Watch a list of resources
 * useResourceWatch({
 *   resourceType: 'edge.miloapis.com/v1alpha1/dnszones',
 *   namespace: projectId,
 *   queryKey: dnsZoneKeys.list(projectId),
 *   transform: toDnsZone,
 *   getItemKey: (zone) => zone.name,
 * });
 *
 * // Watch a single resource
 * useResourceWatch({
 *   resourceType: 'edge.miloapis.com/v1alpha1/dnszones',
 *   namespace: projectId,
 *   name: zoneName,
 *   queryKey: dnsZoneKeys.detail(projectId, zoneName),
 *   transform: toDnsZone,
 * });
 * ```
 */
export function useResourceWatch<T>({
  queryKey,
  enabled = true,
  transform,
  onEvent,
  throttleMs = DEFAULT_THROTTLE_MS,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  getItemKey,
  getMeta,
  updateListCache,
  updateSingleCache,
  accepts,
  applyCacheUpdates = true,
  getMirroredKeys,
  syncKind,
  syncScope,
  ...watchOptions
}: UseResourceWatchOptions<T>) {
  const queryClient = useQueryClient();
  const manager = useWatchManager();

  const current = {
    watchOptions: watchOptions as WatchOptions,
    queryKey,
    transform,
    onEvent,
    throttleMs,
    debounceMs,
    getItemKey,
    getMeta,
    updateListCache,
    updateSingleCache,
    accepts,
    applyCacheUpdates,
    getMirroredKeys,
    syncKind,
    syncScope,
  };
  const latest = useRef(current);
  latest.current = current;

  const channelKey = manager.buildChannelKey(watchOptions as WatchOptions);
  const queryKeyHash = hashKey(queryKey);

  useEffect(() => {
    if (!enabled) return;

    // Pin the key for this subscription: a late event from this channel must
    // never write into the key of the channel that replaces it.
    const effectQueryKey = latest.current.queryKey;
    const isDetail = !!latest.current.watchOptions.name;
    const release = retainWatchedKey(queryClient, effectQueryKey);
    const throttle = createInvalidateThrottle(queryClient, effectQueryKey, () => latest.current);
    let active = true;

    const handleEvent = (event: WatchEvent) => {
      if (!active) return;
      const options = latest.current;
      const typedEvent = toTypedEvent(event, options.transform);
      const resyncs = event.type === 'RESYNC' || event.type === 'ERROR';

      if (event.type === 'ERROR') {
        addBreadcrumb('warn', 'watch error, resyncing', 'watch', {
          resourceType: options.watchOptions.resourceType,
        });
      }
      if (event.type !== 'RESYNC') options.onEvent?.(typedEvent);
      // onEvent may own the writes, but only the scheduler refetches after a gap.
      if (!options.applyCacheUpdates && !resyncs) return;

      const cfg: WatchCacheConfig<T> = {
        queryKey: effectQueryKey,
        isDetail,
        getItemKey: options.getItemKey,
        getMeta: options.getMeta,
        updateListCache: options.updateListCache,
        updateSingleCache: options.updateSingleCache,
        accepts: options.accepts,
        mirroredKeys: options.getMirroredKeys,
        syncKind: options.syncKind,
        syncScope: options.syncScope,
      };
      if (applyWatchEvent(queryClient, cfg, typedEvent) === 'invalidate') throttle.request();
    };

    const unsubscribe = manager.subscribe(latest.current.watchOptions, handleEvent);

    return () => {
      active = false;
      throttle.cancel();
      unsubscribe();
      if (!release()) return;
      markUnwatched(queryClient, effectQueryKey, isDetail);
      for (const key of latest.current.getMirroredKeys?.() ?? []) {
        markUnwatched(queryClient, key, true);
      }
    };
  }, [enabled, channelKey, queryKeyHash, queryClient, manager]);
}
