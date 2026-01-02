// app/modules/watch/use-resource-watch.ts
import { watchManager } from './watch.manager';
import type { WatchEvent, UseResourceWatchOptions } from './watch.types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

// Debounce delay for list invalidation (ms)
const INVALIDATE_DEBOUNCE_MS = 300;

// Initial sync period - skip ADDED events during this time (ms)
// Watch sends ADDED events for all existing resources on startup
// Since hydration already seeded the cache, we skip these initial ADDED events
const INITIAL_SYNC_PERIOD_MS = 2000;

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
  ...watchOptions
}: UseResourceWatchOptions<T>) {
  const queryClient = useQueryClient();
  const transformRef = useRef(transform);
  const onEventRef = useRef(onEvent);
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionStartTimeRef = useRef<number>(0);

  // Keep refs updated without triggering effect
  transformRef.current = transform;
  onEventRef.current = onEvent;

  // Check if we're in the initial sync period (skip ADDED events)
  const isInInitialSyncPeriod = useCallback(() => {
    return Date.now() - subscriptionStartTimeRef.current < INITIAL_SYNC_PERIOD_MS;
  }, []);

  // Debounced invalidation for list queries
  const debouncedInvalidate = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }
    invalidateTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey });
      invalidateTimeoutRef.current = null;
    }, INVALIDATE_DEBOUNCE_MS);
  }, [queryClient, queryKey]);

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
              // Single resource: update cache directly
              queryClient.setQueryData(queryKey, transformedEvent.object);
            } else {
              // List: debounced invalidate to batch multiple events
              debouncedInvalidate();
            }
            break;

          case 'MODIFIED':
            if (name) {
              // Single resource: update cache directly
              queryClient.setQueryData(queryKey, transformedEvent.object);
            } else {
              // List: debounced invalidate to batch multiple events
              debouncedInvalidate();
            }
            break;

          case 'DELETED':
            if (name) {
              // Single resource: remove from cache
              queryClient.removeQueries({ queryKey });
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
  }, [
    enabled,
    resourceType,
    projectId,
    namespace,
    name,
    JSON.stringify(queryKey),
    queryClient,
    debouncedInvalidate,
    isInInitialSyncPeriod,
  ]);
}
