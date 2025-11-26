import { toast } from '@datum-ui/components';
import { useCallback, useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';

type ToastMessage<T> = string | ((data: T) => string);

type ToastOptions<T> = {
  key?: string;
  success: {
    title: ToastMessage<T>;
    description?: ToastMessage<T>;
  };
  error?: {
    title?: ToastMessage<T>;
    description?: ToastMessage<T>;
  };
};

type FetcherData = {
  success: boolean;
  error?: string;
};

/**
 * Custom hook that wraps useFetcher with automatic toast notifications.
 *
 * This hook solves the issue where fetcher.data persists across page navigations,
 * causing unintended toast notifications when navigating to pages that also use
 * fetcher-based toast handling.
 *
 * The hook tracks whether a submission was initiated from this component instance,
 * ensuring toasts only appear for actions triggered by this specific component.
 *
 * @param options - Toast configuration options
 * @param options.key - Optional unique key to identify this fetcher (useful when using multiple fetchers in the same component)
 * @param options.success - Success toast configuration
 * @param options.success.title - Title to display on successful action
 * @param options.success.description - Optional description for success toast
 * @param options.error - Error toast configuration (optional)
 * @param options.error.title - Optional custom error title (falls back to fetcher.data.error)
 * @param options.error.description - Optional error description
 *
 * @example
 * ```tsx
 * // Static messages
 * const fetcher = useFetcherWithToast({
 *   success: {
 *     title: 'Item deleted successfully',
 *     description: 'The item has been removed',
 *   },
 * });
 *
 * // Multiple fetchers in the same component
 * const deleteFetcher = useFetcherWithToast({
 *   key: 'delete-item',
 *   success: { title: 'Item deleted' },
 * });
 * const refreshFetcher = useFetcherWithToast({
 *   key: 'refresh-item',
 *   success: { title: 'Item refreshed' },
 * });
 *
 * // Dynamic messages based on response data
 * const fetcher = useFetcherWithToast<{ success: boolean; name: string }>({
 *   success: {
 *     title: (data) => `${data.name} deleted successfully`,
 *     description: (data) => `The item "${data.name}" has been removed`,
 *   },
 *   error: {
 *     title: 'Failed to delete item',
 *   },
 * });
 *
 * // Use fetcher.submit() as normal - toast will only show for this component's submissions
 * fetcher.submit({ id: '123' }, { method: 'DELETE', action: '/api/items' });
 * ```
 */
export function useFetcherWithToast<T extends FetcherData = FetcherData>(options: ToastOptions<T>) {
  const fetcher = useFetcher<T>({ key: options.key });
  const hasSubmitted = useRef(false);

  const resolveMessage = (message: ToastMessage<T> | undefined, data: T): string | undefined => {
    if (typeof message === 'function') {
      return message(data);
    }
    return message;
  };

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
        const title = resolveMessage(options.success.title, data);
        toast.success(title ?? 'Success', {
          description: resolveMessage(options.success.description, data),
        });
      } else {
        const title =
          resolveMessage(options.error?.title, data) ?? data.error ?? 'An error occurred';
        toast.error(title, {
          description: resolveMessage(options.error?.description, data),
        });
      }
    }
  }, [fetcher.data, fetcher.state, options.success, options.error]);

  return {
    ...fetcher,
    submit,
  };
}
