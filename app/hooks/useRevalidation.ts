import { useCallback, useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

/**
 * Options for configuring the revalidation behavior
 */
export interface UseRevalidationOptions {
  /**
   * Polling interval in milliseconds, or false to disable polling.
   * @default false
   * @example
   * // Poll every 10 seconds when there are pending items
   * interval: hasPendingItems ? 10000 : false
   */
  interval?: number | false;

  /**
   * Revalidate when the window regains focus.
   * Similar to TanStack Query's refetchOnWindowFocus.
   * @default true
   */
  refetchOnFocus?: boolean;

  /**
   * Revalidate when the network reconnects (online event).
   * Similar to TanStack Query's refetchOnReconnect.
   * @default true
   */
  refetchOnReconnect?: boolean;

  /**
   * Minimum time in milliseconds between revalidations.
   * Prevents rapid successive revalidations (e.g., quick tab switches).
   * @default 0
   * @example
   * // Only refetch if data is older than 5 seconds
   * staleTime: 5000
   */
  staleTime?: number;

  /**
   * Master switch to enable/disable all revalidation.
   * When false, no revalidation will occur (polling, focus, or reconnect).
   * @default true
   */
  enabled?: boolean;
}

/**
 * Return value from useRevalidation hook
 */
export interface UseRevalidationReturn {
  /**
   * Manually trigger a revalidation.
   * This bypasses staleTime and forces an immediate revalidation.
   */
  revalidate: () => void;

  /**
   * Current revalidation state from react-router.
   * - 'idle': No revalidation in progress
   * - 'loading': Revalidation is in progress
   */
  state: 'idle' | 'loading';

  /**
   * Whether interval polling is currently active.
   */
  isPolling: boolean;

  /**
   * Manually start interval polling.
   * Useful when you need programmatic control over polling.
   */
  start: () => void;

  /**
   * Manually stop interval polling.
   * Useful when you need programmatic control over polling.
   */
  stop: () => void;
}

/**
 * A hook for managing data revalidation with support for polling, focus refetch,
 * and network reconnection refetch. Similar to TanStack Query's refetch behavior
 * but designed for React Router's loader pattern.
 *
 * @example
 * // Basic usage - refetch on focus and reconnect (TanStack Query-like defaults)
 * const { revalidate } = useRevalidation();
 *
 * @example
 * // With conditional polling
 * const { revalidate } = useRevalidation({
 *   interval: hasPendingItems ? 10000 : false,
 * });
 *
 * @example
 * // With stale time to prevent rapid refetches
 * const { revalidate } = useRevalidation({
 *   staleTime: 5000, // Don't refetch if data is less than 5s old
 * });
 *
 * @example
 * // Disable focus refetch, only use polling
 * const { revalidate } = useRevalidation({
 *   interval: 10000,
 *   refetchOnFocus: false,
 *   refetchOnReconnect: false,
 * });
 *
 * @example
 * // Use in fetcher callbacks
 * const createFetcher = useDatumFetcher({
 *   onSuccess: () => {
 *     toast.success('Created!');
 *     revalidate(); // Force immediate refresh
 *   },
 * });
 */
export function useRevalidation(options: UseRevalidationOptions = {}): UseRevalidationReturn {
  const {
    interval = false,
    refetchOnFocus = true,
    refetchOnReconnect = true,
    staleTime = 0,
    enabled = true,
  } = options;

  const revalidator = useRevalidator();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRevalidationRef = useRef<number>(0);
  const isMountedRef = useRef(false);

  /**
   * Check if enough time has passed since the last revalidation
   */
  const canRevalidate = useCallback(() => {
    if (staleTime <= 0) return true;
    return Date.now() - lastRevalidationRef.current >= staleTime;
  }, [staleTime]);

  /**
   * Smart revalidate that respects staleTime
   */
  const smartRevalidate = useCallback(() => {
    if (!isMountedRef.current || !enabled) return;
    if (!canRevalidate()) return;

    lastRevalidationRef.current = Date.now();
    revalidator.revalidate();
  }, [enabled, canRevalidate, revalidator]);

  /**
   * Force revalidate - bypasses staleTime check
   */
  const forceRevalidate = useCallback(() => {
    if (!isMountedRef.current) return;

    lastRevalidationRef.current = Date.now();
    revalidator.revalidate();
  }, [revalidator]);

  /**
   * Stop interval polling
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Start interval polling
   */
  const startPolling = useCallback(() => {
    if (!enabled || !interval) return;

    stopPolling();
    intervalRef.current = setInterval(smartRevalidate, interval);
  }, [enabled, interval, smartRevalidate, stopPolling]);

  // Track mount state to avoid React state update warnings
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle interval polling
  useEffect(() => {
    if (!enabled || !interval) {
      stopPolling();
      return;
    }

    // Defer start to next frame to avoid React state update warning
    const frameId = requestAnimationFrame(() => {
      if (isMountedRef.current) {
        startPolling();
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      stopPolling();
    };
  }, [enabled, interval, startPolling, stopPolling]);

  // Handle focus, visibility, and reconnect events
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (refetchOnFocus && document.visibilityState === 'visible') {
        smartRevalidate();
      }
    };

    const handleFocus = () => {
      if (refetchOnFocus) {
        smartRevalidate();
      }
    };

    const handleOnline = () => {
      if (refetchOnReconnect) {
        smartRevalidate();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, refetchOnFocus, refetchOnReconnect, smartRevalidate]);

  return {
    revalidate: forceRevalidate,
    state: revalidator.state,
    isPolling: !!intervalRef.current,
    start: startPolling,
    stop: stopPolling,
  };
}
