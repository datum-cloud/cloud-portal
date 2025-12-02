import { useCallback, useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';

type FetcherData = {
  success: boolean;
  error?: string;
};

type DatumFetcherOptions<T> = {
  key?: string;
  onSuccess?: (data: T) => void;
  onError?: (data: T) => void;
};

/**
 * Custom hook that wraps useFetcher with callback support.
 *
 * This hook solves the issue where fetcher.data persists across page navigations,
 * causing unintended callbacks when navigating to pages that also use
 * fetcher-based handling.
 *
 * The hook tracks whether a submission was initiated from this component instance,
 * ensuring callbacks only fire for actions triggered by this specific component.
 *
 * @param options - Fetcher configuration options
 * @param options.key - Optional unique key to identify this fetcher (useful when using multiple fetchers in the same component)
 * @param options.onSuccess - Callback when data.success is true
 * @param options.onError - Callback when data.success is false
 *
 * @example
 * ```tsx
 * // Basic usage with callbacks
 * const fetcher = useDatumFetcher({
 *   onSuccess: (data) => {
 *     toast.success('Item deleted successfully');
 *     closeDialog();
 *   },
 *   onError: (data) => {
 *     toast.error(data.error || 'An error occurred');
 *   },
 * });
 *
 * // Multiple fetchers in the same component
 * const deleteFetcher = useDatumFetcher({
 *   key: 'delete-item',
 *   onSuccess: () => navigate('/items'),
 * });
 * const refreshFetcher = useDatumFetcher({
 *   key: 'refresh-item',
 *   onSuccess: () => revalidate(),
 * });
 *
 * // Use fetcher.submit() as normal - callbacks only fire for this component's submissions
 * fetcher.submit({ id: '123' }, { method: 'DELETE', action: '/api/items' });
 * ```
 */
export function useDatumFetcher<T extends FetcherData = FetcherData>(
  options: DatumFetcherOptions<T> = {}
) {
  const fetcher = useFetcher<T>({ key: options.key });
  const hasSubmitted = useRef(false);

  const submit = useCallback(
    (...args: Parameters<typeof fetcher.submit>) => {
      hasSubmitted.current = true;
      return fetcher.submit(...args);
    },
    [fetcher]
  );

  useEffect(() => {
    if (hasSubmitted.current && fetcher.data && fetcher.state === 'idle') {
      hasSubmitted.current = false;
      const data = fetcher.data as T;

      if (data.success) {
        options.onSuccess?.(data);
      } else {
        options.onError?.(data);
      }
    }
  }, [fetcher.data, fetcher.state, options.onSuccess, options.onError]);

  return {
    ...fetcher,
    submit,
  };
}
