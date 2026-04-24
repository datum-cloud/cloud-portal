import { useDataTablePagination } from '@datum-cloud/datum-ui/data-table';
import { useEffect, useLayoutEffect, useRef } from 'react';

// useLayoutEffect commits before paint — the restore lands before the browser
// has a chance to show the pageIndex=0 frame. Fall back to useEffect during
// SSR so React Router v7 doesn't warn.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Workaround for a datum-ui client-mode store quirk: its internal `setData`
 * forcibly resets `pageIndex` to 0 whenever the `data` prop reference
 * changes. Cloud-portal's real-time watch hooks (useResourceWatch +
 * queryClient.setQueryData) rebuild the cached list array on every server
 * event, so the user's current page snaps back to 1 each time a watch
 * update lands.
 *
 * Strategy — track the last "stable" pageIndex locally:
 *
 * - On renders where `data` has NOT just changed, we trust the current
 *   `pageIndex` as user intent and stash it in `stablePageIndexRef`. That
 *   covers initial hydration (URL `?page=N` → store pageIndex), explicit
 *   user clicks, and any other deliberate navigation.
 *
 * - On renders where `data` HAS just changed, we wait for datum-ui's
 *   `setData` effect to drop `pageIndex` to 0. When we observe that drop,
 *   we restore to the last stable value we remembered (if still in range).
 *
 * This approach does NOT rely on the URL being intact at any given moment,
 * so it survives rapid-fire watch events that briefly strip the `?page`
 * param from the URL.
 *
 * Must render INSIDE `DataTable.Client` so `useDataTablePagination` sees
 * the store context.
 */
export function PagePreserver<TData>({ data }: { data: readonly TData[] }) {
  const { pageIndex, pageCount, setPageIndex } = useDataTablePagination();
  const prevDataRef = useRef(data);
  const prevPageIndexRef = useRef(pageIndex);
  const stablePageIndexRef = useRef(pageIndex);
  // Counter instead of boolean: watch events can land back-to-back; the
  // reset-detection window needs to span the whole data-change → setData-
  // reset sequence (typically 2 render cycles).
  const resetWindowRef = useRef(0);

  if (prevDataRef.current !== data) {
    prevDataRef.current = data;
    resetWindowRef.current = 2;
  }

  useIsomorphicLayoutEffect(() => {
    const prevPI = prevPageIndexRef.current;
    prevPageIndexRef.current = pageIndex;

    const inResetWindow = resetWindowRef.current > 0;
    if (inResetWindow) resetWindowRef.current -= 1;

    // Reset detected: pageIndex collapsed from > 0 to 0 within the window.
    if (inResetWindow && prevPI > 0 && pageIndex === 0) {
      const intended = stablePageIndexRef.current;
      resetWindowRef.current = 0;
      if (intended > 0 && intended < pageCount) {
        setPageIndex(intended);
      }
      return;
    }

    // Otherwise capture the current pageIndex as the user's intent — but
    // skip the capture when pageIndex=0 AND we're still inside the reset
    // window, because that could be the setData-reset-in-progress frame.
    const shouldCapture = !inResetWindow || pageIndex > 0;
    if (shouldCapture && stablePageIndexRef.current !== pageIndex) {
      stablePageIndexRef.current = pageIndex;
    }
  }, [data, pageIndex, pageCount, setPageIndex]);

  return null;
}
