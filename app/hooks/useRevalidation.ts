import { useCallback, useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

/**
 * Options for configuring the revalidation behavior.
 */
export interface UseRevalidationOptions {
  /**
   * Polling interval in milliseconds, or `false` to disable polling.
   *
   * Use conditional logic to enable/disable polling based on state:
   * ```tsx
   * interval: hasPendingItems ? 10000 : false
   * ```
   *
   * @default false
   */
  interval?: number | false;

  /**
   * Revalidate when the window regains focus or becomes visible.
   *
   * Listens to both `focus` and `visibilitychange` events to handle:
   * - Tab switching
   * - Window focus changes
   * - Mobile app foreground/background
   *
   * Similar to TanStack Query's `refetchOnWindowFocus`.
   *
   * @default true
   */
  refetchOnFocus?: boolean;

  /**
   * Revalidate when the network reconnects (online event).
   *
   * Useful for handling intermittent connectivity and ensuring
   * data is fresh after network recovery.
   *
   * Similar to TanStack Query's `refetchOnReconnect`.
   *
   * @default true
   */
  refetchOnReconnect?: boolean;

  /**
   * Minimum time in milliseconds between automatic revalidations.
   *
   * Prevents rapid successive revalidations from focus/reconnect events
   * (e.g., quick tab switches, network flapping).
   *
   * Note: Manual calls to `revalidate()` bypass this check.
   *
   * @default 0
   *
   * @example
   * // Only auto-refetch if data is older than 5 seconds
   * staleTime: 5000
   */
  staleTime?: number;
}

/**
 * Return value from the useRevalidation hook.
 */
export interface UseRevalidationReturn {
  /**
   * Manually trigger a revalidation.
   *
   * This bypasses `staleTime` and forces an immediate revalidation.
   * Use this in callbacks after mutations (create, update, delete).
   *
   * @example
   * ```tsx
   * const deleteFetcher = useDatumFetcher({
   *   onSuccess: () => {
   *     toast.success('Deleted!');
   *     revalidate(); // Force immediate refresh
   *   },
   * });
   * ```
   */
  revalidate: () => void;

  /**
   * Current revalidation state from react-router.
   * - `'idle'`: No revalidation in progress
   * - `'loading'`: Revalidation is in progress
   */
  state: 'idle' | 'loading';

  /**
   * Whether interval polling is currently active.
   */
  isPolling: boolean;

  /**
   * Manually start interval polling.
   *
   * Useful when you need programmatic control over polling,
   * such as starting polling after a specific user action.
   */
  start: () => void;

  /**
   * Manually stop interval polling.
   *
   * Useful when you need to temporarily pause polling,
   * such as when a modal is open or during form submission.
   */
  stop: () => void;
}

/**
 * A hook for managing data revalidation with support for polling,
 * focus refetch, and network reconnection refetch.
 *
 * Designed for React Router's loader pattern, providing similar
 * functionality to TanStack Query's automatic refetch behavior.
 *
 * ## Features
 * - **Polling**: Configurable interval-based revalidation
 * - **Focus refetch**: Revalidate when tab/window gains focus
 * - **Reconnect refetch**: Revalidate when network comes back online
 * - **Stale time**: Prevent rapid successive revalidations
 * - **Manual control**: Start/stop polling programmatically
 *
 * ---
 *
 * ## Usage Examples
 *
 * ### Basic usage (focus and reconnect refetch with defaults)
 * ```tsx
 * function MyComponent() {
 *   const { revalidate } = useRevalidation();
 *
 *   // Data will auto-refresh on:
 *   // - Tab focus
 *   // - Window focus
 *   // - Network reconnect
 * }
 * ```
 *
 * ### Conditional polling (poll only when needed)
 * ```tsx
 * function DomainsPage() {
 *   const { data } = useLoaderData();
 *   const hasPendingDomains = data.some((d) => d.status === 'pending');
 *
 *   const { revalidate } = useRevalidation({
 *     // Poll every 10s only when there are pending items
 *     interval: hasPendingDomains ? 10000 : false,
 *   });
 * }
 * ```
 *
 * ### With stale time (prevent rapid refetches)
 * ```tsx
 * function Dashboard() {
 *   const { revalidate } = useRevalidation({
 *     refetchOnFocus: true,
 *     staleTime: 5000, // Don't auto-refetch if data is < 5s old
 *   });
 * }
 * ```
 *
 * ### Polling only (disable focus/reconnect)
 * ```tsx
 * function LiveFeed() {
 *   const { revalidate } = useRevalidation({
 *     interval: 3000,
 *     refetchOnFocus: false,
 *     refetchOnReconnect: false,
 *   });
 * }
 * ```
 *
 * ### Disable all automatic revalidation
 * ```tsx
 * function StaticPage() {
 *   const { revalidate } = useRevalidation({
 *     interval: false,
 *     refetchOnFocus: false,
 *     refetchOnReconnect: false,
 *   });
 *
 *   // Only manual revalidate() calls will trigger refresh
 * }
 * ```
 *
 * ### Manual control with start/stop
 * ```tsx
 * function PollingControl() {
 *   const { start, stop, isPolling } = useRevalidation({
 *     interval: 5000,
 *   });
 *
 *   return (
 *     <button onClick={isPolling ? stop : start}>
 *       {isPolling ? 'Stop' : 'Start'} Polling
 *     </button>
 *   );
 * }
 * ```
 *
 * ### With mutation callbacks
 * ```tsx
 * function ItemsList() {
 *   const { revalidate } = useRevalidation();
 *
 *   const deleteFetcher = useDatumFetcher({
 *     onSuccess: () => {
 *       toast.success('Item deleted');
 *       revalidate(); // Force immediate refresh
 *     },
 *   });
 *
 *   const createFetcher = useDatumFetcher({
 *     onSuccess: () => {
 *       toast.success('Item created');
 *       revalidate();
 *     },
 *   });
 * }
 * ```
 *
 * ---
 *
 * @param options - Configuration options for revalidation behavior
 * @returns Object with revalidate function, state, and polling controls
 *
 * @see https://tanstack.com/query/latest/docs/react/guides/window-focus-refetching
 */
export function useRevalidation(options: UseRevalidationOptions = {}): UseRevalidationReturn {
  const {
    interval = false,
    refetchOnFocus = true,
    refetchOnReconnect = true,
    staleTime = 0,
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
    if (!isMountedRef.current) return;
    if (!canRevalidate()) return;

    lastRevalidationRef.current = Date.now();
    revalidator.revalidate();
  }, [canRevalidate, revalidator]);

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
    if (!interval) return;

    stopPolling();
    intervalRef.current = setInterval(smartRevalidate, interval);
  }, [interval, smartRevalidate, stopPolling]);

  // Track mount state to avoid React state update warnings
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle interval polling
  useEffect(() => {
    if (!interval) {
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
  }, [interval, startPolling, stopPolling]);

  // Handle focus, visibility, and reconnect events
  useEffect(() => {
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
  }, [refetchOnFocus, refetchOnReconnect, smartRevalidate]);

  return {
    revalidate: forceRevalidate,
    state: revalidator.state,
    isPolling: !!intervalRef.current,
    start: startPolling,
    stop: stopPolling,
  };
}
