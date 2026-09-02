// app/modules/watch/use-resource-watch.ts
import { liveUpdatesStore } from './live-updates.store';
import { watchManager } from './watch.manager';
import type { WatchEvent, WatchEventType, UseResourceWatchOptions } from './watch.types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

// Default configuration values
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_THROTTLE_MS = 1000; // Reduced from 5000 for better responsiveness
const DEFAULT_INITIAL_SYNC_PERIOD_MS = 2000;

export type WatchEventDisposition = 'ungated' | 'replay' | 'gated' | 'resync';

/**
 * Is `now` inside the replay window opened at `anchor`?
 *
 * The window exists because of the upstream replay a channel reconnect
 * triggers — see WatchEventType.RESYNC. Anything arriving inside the window
 * is presumed to be that replay.
 *
 * Pure and exported for unit tests — see `classifyWatchEvent`'s note.
 */
export function isWithinReplayWindow(anchor: number, now: number): boolean {
  return now - anchor < DEFAULT_INITIAL_SYNC_PERIOD_MS;
}

/**
 * The replay window's anchor after handling one event.
 *
 * A 'resync' event re-opens the window at `now`; everything else leaves it
 * where it was. A mount-only anchor is not enough, because a reconnect can
 * reopen the window long after mount — see WatchEventType.RESYNC.
 */
export function nextReplayAnchor(
  anchor: number,
  disposition: WatchEventDisposition,
  now: number
): number {
  return disposition === 'resync' ? now : anchor;
}

/** The complete per-event decision. See {@link planWatchEvent}. */
export interface WatchEventPlan {
  /** How the event relates to the live-updates pause. */
  readonly disposition: WatchEventDisposition;
  /** The replay window's anchor after this event. */
  readonly replayAnchor: number;
  /**
   * True when an ADDED event must not reach the cache-update switch because
   * it landed inside the initial-sync period.
   *
   * Governed by `skipInitialSync` and the MOUNT time — never by the replay
   * anchor. Those are two different clocks and conflating them is a live
   * defect: re-anchoring on reconnect would also re-arm this skip, and the
   * replay's ADDED events would stop reaching `debouncedInvalidate()`. With
   * `refetchOnWindowFocus: false` and a 5-minute `staleTime`, that
   * invalidate is the only thing that repairs the cache after a gap — and a
   * replay carries no DELETED events, so a deletion during the gap is
   * recoverable there and nowhere else.
   */
  readonly skipsInitialSyncAdded: boolean;
}

/**
 * The whole per-event decision, in one pure function.
 *
 * It exists to keep the two clocks apart by construction: `mountedAt` and
 * `replayAnchor` arrive as separate arguments, so no caller can accidentally
 * back both concerns with one value. The hook holds them in two refs and
 * does nothing but apply what this returns.
 */
export function planWatchEvent(args: {
  hasName: boolean;
  eventType: WatchEventType;
  skipInitialSync: boolean;
  /** When this watch subscribed. Never moves. */
  mountedAt: number;
  /** When the replay window last opened. Moves on every RESYNC. */
  replayAnchor: number;
  now: number;
}): WatchEventPlan {
  const { hasName, eventType, skipInitialSync, mountedAt, replayAnchor, now } = args;

  const disposition = classifyWatchEvent({
    hasName,
    eventType,
    isWithinReplayWindow: isWithinReplayWindow(replayAnchor, now),
  });

  return {
    disposition,
    replayAnchor: nextReplayAnchor(replayAnchor, disposition, now),
    skipsInitialSyncAdded:
      eventType === 'ADDED' && skipInitialSync && isWithinReplayWindow(mountedAt, now),
  };
}

/**
 * Decide how a watch event relates to the live-updates pause, independent
 * of `skipInitialSync` (which governs cache invalidation, not counting):
 *
 * - 'resync': a synthetic RESYNC marker from WatchManager, raised when the
 *   hub confirms a (re)subscribe or restarts an upstream after a 410. It
 *   carries no resource object; its only job is to re-open the replay
 *   window via {@link nextReplayAnchor}.
 * - 'ungated': single-resource watches, and non-data events (ERROR,
 *   BOOKMARK). Always applied.
 * - 'replay': an ADDED event that arrived inside the replay window. These
 *   are not "updates" a paused reader is missing — they're the list they're
 *   already looking at — so they must never be tallied, and while paused
 *   must not be applied either (the cache write would otherwise happen
 *   anyway for the `skipInitialSync: false` resources).
 * - 'gated': every other list data event (ADDED outside the replay
 *   window, or any MODIFIED/DELETED). Goes through the normal pending
 *   tally via `liveUpdatesStore.gate`.
 *
 * Pure and exported so it can be unit-tested directly — this repo has no
 * `@testing-library/react` / DOM adapter to drive the hook itself (see
 * app/features/search/engine/useSearchEngine.test.ts for the precedent).
 */
export function classifyWatchEvent(args: {
  hasName: boolean;
  eventType: WatchEventType;
  isWithinReplayWindow: boolean;
}): WatchEventDisposition {
  const { hasName, eventType, isWithinReplayWindow } = args;

  // Checked before `hasName`: the marker re-anchors every watch, list or not.
  if (eventType === 'RESYNC') return 'resync';
  if (hasName) return 'ungated';
  if (eventType !== 'ADDED' && eventType !== 'MODIFIED' && eventType !== 'DELETED') {
    return 'ungated';
  }
  if (eventType === 'ADDED' && isWithinReplayWindow) return 'replay';
  return 'gated';
}

/**
 * Hook to subscribe to K8s Watch API and update React Query cache.
 *
 * @example
 * ```tsx
 * // Watch a list of resources
 * useResourceWatch({
 *   resourceType: 'edge.miloapis.com/v1alpha1/dnszones',
 *   namespace: projectId,
 *   queryKey: dnsZoneKeys.list(projectId),
 *   transform: toDnsZone,
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
  resourceType,
  projectId,
  namespace,
  name,
  queryKey,
  enabled = true,
  transform,
  onEvent,
  throttleMs = DEFAULT_THROTTLE_MS,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  skipInitialSync = true,
  getItemKey,
  updateListCache,
  updateSingleCache,
  ...watchOptions
}: UseResourceWatchOptions<T>) {
  const queryClient = useQueryClient();
  const transformRef = useRef(transform);
  const onEventRef = useRef(onEvent);
  const queryKeyRef = useRef(queryKey);
  const getItemKeyRef = useRef(getItemKey);
  const updateListCacheRef = useRef(updateListCache);
  const updateSingleCacheRef = useRef(updateSingleCache);
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Two clocks — see WatchEventPlan.
  const subscriptionStartTimeRef = useRef<number>(0);
  const replayAnchorRef = useRef<number>(0);
  const lastRefetchTimeRef = useRef<number>(0);

  // Store config in refs to avoid recreating callbacks
  const throttleMsRef = useRef(throttleMs);
  const debounceMsRef = useRef(debounceMs);
  const skipInitialSyncRef = useRef(skipInitialSync);

  // Keep refs updated without triggering effect
  transformRef.current = transform;
  onEventRef.current = onEvent;
  queryKeyRef.current = queryKey;
  getItemKeyRef.current = getItemKey;
  updateListCacheRef.current = updateListCache;
  updateSingleCacheRef.current = updateSingleCache;
  throttleMsRef.current = throttleMs;
  debounceMsRef.current = debounceMs;
  skipInitialSyncRef.current = skipInitialSync;

  // Debounced + throttled invalidation for list queries
  // Debounce: batch rapid events together
  // Throttle: prevent refetching more than once per throttleMs
  // Uses refs to avoid recreating callback and prevent effect re-runs
  const debouncedInvalidate = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }
    invalidateTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastRefetch = now - lastRefetchTimeRef.current;

      // Skip if we refetched recently (throttle)
      if (timeSinceLastRefetch < throttleMsRef.current) {
        invalidateTimeoutRef.current = null;
        return;
      }

      lastRefetchTimeRef.current = now;
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
      invalidateTimeoutRef.current = null;
    }, debounceMsRef.current);
  }, [queryClient]); // Only depends on queryClient, uses refs for config

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // two clocks — see WatchEventPlan
    const mountedAt = Date.now();
    subscriptionStartTimeRef.current = mountedAt;
    replayAnchorRef.current = mountedAt;

    const unsubscribe = watchManager.subscribe(
      { resourceType, projectId, namespace, name, ...watchOptions },
      (event: WatchEvent) => {
        // Plan BEFORE transforming: a RESYNC marker carries no resource
        // object, so running the caller's `transform` over it would be
        // meaningless at best and a crash at worst.
        const now = Date.now();
        const plan = planWatchEvent({
          hasName: Boolean(name),
          eventType: event.type,
          skipInitialSync: skipInitialSyncRef.current,
          mountedAt: subscriptionStartTimeRef.current,
          replayAnchor: replayAnchorRef.current,
          now,
        });
        const { disposition } = plan;

        // Re-open the replay window on RESYNC — see WatchEventType.RESYNC
        // for why the anchor cannot be set once at mount.
        replayAnchorRef.current = plan.replayAnchor;
        if (disposition === 'resync') return;

        // Transform the event object if transform function provided
        const transformedObject = transformRef.current
          ? transformRef.current(event.object)
          : (event.object as T);

        const transformedEvent: WatchEvent<T> = {
          type: event.type,
          object: transformedObject,
        };

        // Call custom event handler if provided
        onEventRef.current?.(transformedEvent);

        // Paused: hold other people's updates and tally them for the banner.
        // One gate call per event — the tally must count events, not the
        // debounced refetches they collapse into. Never gates mutations,
        // which write to the cache directly and bypass this callback
        // entirely, so your own writes always appear.
        if (disposition === 'gated' && !liveUpdatesStore.gate(queryKeyRef.current)) {
          return;
        }
        // Replay events are dropped while paused rather than tallied — but
        // only for keys that actually have a control. `isHeld`, not
        // `isPaused`, because pausing only reaches surfaces that can show
        // and undo it: the notification badge and the quota bridges set
        // `skipInitialSync: false`, so they land here on every reconnect
        // and must never be silently dropped.
        if (disposition === 'replay' && liveUpdatesStore.isHeld(queryKeyRef.current)) {
          return;
        }

        // Update React Query cache based on event type
        switch (event.type) {
          case 'ADDED':
            // Skip ADDED events during initial sync — two clocks, see
            // WatchEventPlan.
            if (plan.skipsInitialSyncAdded) {
              return;
            }
            if (name) {
              // Single resource: update cache directly or use custom updater
              if (updateSingleCacheRef.current) {
                queryClient.setQueryData(queryKeyRef.current, (oldData: T | undefined) =>
                  updateSingleCacheRef.current!(oldData, transformedEvent.object)
                );
              } else {
                queryClient.setQueryData(queryKeyRef.current, transformedEvent.object);
              }
            } else {
              // List: debounced invalidate to batch multiple events
              debouncedInvalidate();
            }
            break;

          case 'MODIFIED':
            if (name) {
              // Single resource: update cache directly or use custom updater
              if (updateSingleCacheRef.current) {
                queryClient.setQueryData(queryKeyRef.current, (oldData: T | undefined) =>
                  updateSingleCacheRef.current!(oldData, transformedEvent.object)
                );
              } else {
                queryClient.setQueryData(queryKeyRef.current, transformedEvent.object);
              }
            } else if (getItemKeyRef.current) {
              // List with key extractor: in-place update (no network call)
              queryClient.setQueryData(queryKeyRef.current, (oldData: unknown) => {
                if (!oldData) return oldData;
                const itemKey = getItemKeyRef.current!(transformedEvent.object);

                if (updateListCacheRef.current) {
                  return updateListCacheRef.current(oldData, transformedEvent.object);
                }

                // Default: plain array find-and-replace
                if (Array.isArray(oldData)) {
                  return oldData.map((item: T) =>
                    getItemKeyRef.current!(item) === itemKey ? transformedEvent.object : item
                  );
                }

                return oldData;
              });
            } else {
              // List without key extractor: fallback to invalidate
              debouncedInvalidate();
            }
            break;

          case 'DELETED':
            if (name) {
              // Single resource: remove from cache
              queryClient.removeQueries({ queryKey: queryKeyRef.current });
            } else if (getItemKeyRef.current) {
              // List with key extractor: remove in-place (no network call)
              queryClient.setQueryData(queryKeyRef.current, (oldData: unknown) => {
                if (!oldData) return oldData;
                const itemKey = getItemKeyRef.current!(transformedEvent.object);

                if (Array.isArray(oldData)) {
                  return oldData.filter((item: T) => getItemKeyRef.current!(item) !== itemKey);
                }

                // Paginated { items: T[] } shape
                if (
                  typeof oldData === 'object' &&
                  oldData !== null &&
                  Array.isArray((oldData as { items?: unknown }).items)
                ) {
                  const list = oldData as { items: T[] };
                  return {
                    ...list,
                    items: list.items.filter((item) => getItemKeyRef.current!(item) !== itemKey),
                  };
                }

                return oldData;
              });
            } else {
              // List without key extractor: fallback to invalidate
              debouncedInvalidate();
            }
            break;

          case 'ERROR':
            console.error('[useResourceWatch] Watch error:', event.object);
            break;

          case 'BOOKMARK':
            // Bookmark events are for resourceVersion tracking only
            break;
        }
      }
    );

    return unsubscribe;
    // Note: queryKey is accessed via queryKeyRef to avoid effect re-runs
    // debouncedInvalidate is stable (only depends on queryClient)
  }, [enabled, resourceType, projectId, namespace, name, queryClient, debouncedInvalidate]);
}
