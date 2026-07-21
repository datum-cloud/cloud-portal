// app/modules/watch/use-resource-watch.ts
import { watchManager } from './watch.manager';
import type { WatchEvent, UseResourceWatchOptions } from './watch.types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

// Default configuration values
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_THROTTLE_MS = 1000; // Reduced from 5000 for better responsiveness
const DEFAULT_INITIAL_SYNC_PERIOD_MS = 2000;

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
  const subscriptionStartTimeRef = useRef<number>(0);
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

  // Check if we're in the initial sync period (skip ADDED events)
  const isInInitialSyncPeriod = useCallback(() => {
    if (!skipInitialSyncRef.current) return false;
    return Date.now() - subscriptionStartTimeRef.current < DEFAULT_INITIAL_SYNC_PERIOD_MS;
  }, []);

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

    // Track when subscription starts to skip initial sync ADDED events
    subscriptionStartTimeRef.current = Date.now();

    const unsubscribe = watchManager.subscribe(
      { resourceType, projectId, namespace, name, ...watchOptions },
      (event: WatchEvent) => {
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

        // Update React Query cache based on event type
        switch (event.type) {
          case 'ADDED':
            // Skip ADDED events during initial sync - cache is already hydrated
            if (isInInitialSyncPeriod()) {
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
            } else {
              // List: debounced invalidate to batch multiple events
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
  }, [
    enabled,
    resourceType,
    projectId,
    namespace,
    name,
    queryClient,
    debouncedInvalidate,
    isInInitialSyncPeriod,
  ]);
}
