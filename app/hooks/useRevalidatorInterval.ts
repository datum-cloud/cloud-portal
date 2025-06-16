import { useCallback, useEffect, useRef } from 'react';
import { useRevalidator } from 'react-router';

/**
 * Options for configuring the revalidation interval
 */
interface Options {
  /** Whether the interval should start automatically (default: false) */
  enabled?: boolean;
  /** Interval duration in milliseconds (default: 1000) */
  interval?: number;
}

/**
 * A hook that sets up an interval to revalidate data at regular intervals.
 *
 * @example
 * ```tsx
 * // Basic usage with auto-start when enabled
 * const { clear, start, revalidate, isActive } = useRevalidateOnInterval({
 *   enabled: true, // Start automatically
 *   interval: 5000, // Revalidate every 5 seconds
 * });
 *
 * // Manual control
 * const { start, clear, isActive } = useRevalidateOnInterval({ interval: 3000 });
 *
 * // Start manually when needed
 * const handleStartPolling = () => {
 *   if (!isActive) {
 *     start();
 *   }
 * };
 * ```
 *
 * @param options - Configuration options for the revalidation interval
 * @returns Object containing functions to control the interval and check its status
 */
export function useRevalidateOnInterval({ enabled = false, interval = 1000 }: Options) {
  const revalidate = useRevalidator();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearIntervalFn = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    // Clear any existing interval first
    clearIntervalFn();

    // Start a new interval
    intervalRef.current = setInterval(() => revalidate.revalidate(), interval);
    return () => clearIntervalFn();
  }, [revalidate, interval, clearIntervalFn]);

  useEffect(() => {
    if (enabled) {
      return startInterval();
    }
    return undefined;
  }, [enabled, startInterval]);

  return {
    /** Stops the revalidation interval if it's running */
    clear: clearIntervalFn,
    /** Starts the revalidation interval (clears any existing interval first) */
    start: startInterval,
    /** Manually triggers a single revalidation without affecting the interval */
    revalidate: revalidate.revalidate,
    /** Boolean indicating whether the interval is currently active */
    isActive: !!intervalRef.current,
  };
}
