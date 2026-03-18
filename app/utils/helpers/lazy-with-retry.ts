import { lazy } from 'react';

/**
 * Wraps React.lazy with retry logic for handling stale chunk loads.
 *
 * When a deployment happens, old chunk hashes become invalid. Browsers with
 * cached entry points try to import chunks that no longer exist (502/404).
 * This utility retries the import once, and if it still fails, triggers a
 * page reload to get fresh entry points.
 *
 * Uses sessionStorage to prevent infinite reload loops.
 */

export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName?: string
) {
  return lazy(() =>
    factory().catch((error: unknown) => {
      const storageKey = `chunk-retry-${chunkName ?? 'unknown'}`;
      const hasRetried = sessionStorage.getItem(storageKey);

      if (!hasRetried) {
        sessionStorage.setItem(storageKey, '1');
        // Reload to get fresh entry points with new chunk hashes
        window.location.reload();
        // Return a never-resolving promise to prevent render during reload
        return new Promise<{ default: T }>(() => {});
      }

      // Already retried — clear flag and re-throw so error boundary can catch
      sessionStorage.removeItem(storageKey);
      throw error;
    })
  );
}
