import { buildCELFilter } from './activity-log.helpers';
import type { ActivityLogScope, ActivityLogFilterParams } from './activity-log.schema';
import { createActivityLogService, activityLogKeys } from './activity-log.service';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';

/**
 * Pagination state for server-side cursor-based pagination.
 */
interface PaginationState {
  /** Current page index (0-based) */
  pageIndex: number;
  /** Map of pageIndex → nextCursor for forward navigation */
  cursorCache: Map<number, string>;
  /** The filter key when cursors were cached (cursors are only valid for matching filter) */
  cacheFilterKey: string;
}

/**
 * Hook for querying activity logs with full server-side pagination support.
 *
 * Features:
 * - Server-side filtering (search, action, resource filters → CEL)
 * - Server-side pagination with cursor caching
 * - Automatic cache invalidation on filter changes
 * - Page caching for backward navigation
 *
 * @param scope - The scope to query (organization, project, or user)
 * @param options - Query options including filters and pagination
 *
 * @example
 * ```tsx
 * const {
 *   data,
 *   isLoading,
 *   page,
 *   goToNextPage,
 *   goToPrevPage
 * } = useActivityLogs(
 *   { type: 'project', projectId: 'my-project' },
 *   { filters: { search: 'domain' }, pageSize: 20 }
 * );
 * ```
 */
export function useActivityLogs(
  scope: ActivityLogScope,
  options: {
    filters?: ActivityLogFilterParams;
    startTime?: string;
    endTime?: string;
    pageSize?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    filters = {},
    startTime = 'now-24h',
    endTime = 'now',
    pageSize = 20,
    enabled = true,
  } = options;

  // Build CEL filter from UI filter params (include scope type for search behavior)
  const celFilter = useMemo(
    () => buildCELFilter({ ...filters, scopeType: scope.type }),
    [filters, scope.type]
  );

  // Stable filter key for cache invalidation (JSON stringify for deep comparison)
  const filterKey = useMemo(
    () => JSON.stringify({ filters, startTime, endTime }),
    [filters, startTime, endTime]
  );

  /**
   * Page state management.
   *
   * Tracks:
   * - Current page index (0-based)
   * - Cached cursors for each page (for forward navigation)
   * - The filter key when cursors were cached (for invalidation)
   *
   * Note: Data caching for backward navigation is handled by React Query.
   */
  const [pageState, setPageState] = useState<PaginationState>({
    pageIndex: 0,
    cursorCache: new Map(),
    cacheFilterKey: filterKey,
  });

  // Check if cursor cache is valid for current filters
  // Cursors are only valid if they were captured with the same filter parameters
  const isCacheValid = pageState.cacheFilterKey === filterKey;

  // Get cursor for current page (undefined for page 0, or when cache is invalid)
  // This ensures stale cursors from previous filters are never sent to the API
  const currentCursor =
    pageState.pageIndex === 0 || !isCacheValid
      ? undefined
      : pageState.cursorCache.get(pageState.pageIndex - 1);

  // Query for current page
  const query = useQuery({
    // Include filterKey in query key for proper cache invalidation on filter changes
    queryKey: [...activityLogKeys.page(scope, filters, pageSize, pageState.pageIndex), filterKey],
    queryFn: async () => {
      const service = createActivityLogService();
      const result = await service.query({
        scope,
        startTime,
        endTime,
        filter: celFilter,
        limit: pageSize,
        continue: currentCursor,
      });

      // Cache the cursor for next page navigation (only if filter matches)
      if (result.nextCursor) {
        setPageState((prev) => {
          // Only cache if the filter key still matches (prevents stale cursors)
          if (prev.cacheFilterKey !== filterKey) {
            return prev;
          }
          const newCursorCache = new Map(prev.cursorCache);
          newCursorCache.set(prev.pageIndex, result.nextCursor!);
          return { ...prev, cursorCache: newCursorCache };
        });
      }

      return result;
    },
    enabled: enabled && !!scope,
    staleTime: 30_000, // 30 seconds
  });

  /**
   * Navigate to next page.
   * Only available if current page has more data.
   */
  const goToNextPage = useCallback(() => {
    if (query.data?.hasMore) {
      setPageState((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex + 1,
      }));
    }
  }, [query.data?.hasMore]);

  /**
   * Navigate to previous page.
   * Uses cached data for instant navigation.
   */
  const goToPrevPage = useCallback(() => {
    if (pageState.pageIndex > 0) {
      setPageState((prev) => ({
        ...prev,
        pageIndex: prev.pageIndex - 1,
      }));
    }
  }, [pageState.pageIndex]);

  /**
   * Change page size.
   * Clears cursor cache and resets to page 0 since pagination changes.
   */
  const changePageSize = useCallback(
    (_newSize: number) => {
      setPageState({
        pageIndex: 0,
        cursorCache: new Map(),
        cacheFilterKey: filterKey,
      });
    },
    [filterKey]
  );

  /**
   * Reset pagination when filters change.
   * Called by parent component when filters update.
   */
  const resetPagination = useCallback(() => {
    setPageState({
      pageIndex: 0,
      cursorCache: new Map(),
      cacheFilterKey: filterKey,
    });
  }, [filterKey]);

  return {
    // Data
    data: query.data?.items ?? [],

    // Refetch
    refetch: query.refetch,

    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,

    // Pagination state
    page: pageState.pageIndex,
    hasNextPage: query.data?.hasMore ?? false,
    hasPrevPage: pageState.pageIndex > 0,

    // Pagination actions
    goToNextPage,
    goToPrevPage,
    changePageSize,
    resetPagination,

    // Meta
    effectiveTimeRange: query.data
      ? {
          start: query.data.effectiveStartTime,
          end: query.data.effectiveEndTime,
        }
      : null,
  };
}
