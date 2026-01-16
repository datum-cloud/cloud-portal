import { useApp } from '@/providers/app.provider';
import { useActivityLogs, type ActivityLogScope } from '@/resources/activity-logs';
import { deserializeTimeRange } from '@datum-ui/components/data-table/utils/time-range-serialization';
import {
  type TimeRangeValue,
  toApiTimeRange,
  getBrowserTimezone,
  getPresetByKey,
  getPresetRange,
  DEFAULT_PRESETS,
} from '@datum-ui/components/time-range-picker';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

interface FilterState {
  q?: string;
  actions?: string[];
  resources?: string[];
  period?: TimeRangeValue;
}

export interface UseActivityLogTableOptions {
  /** The scope to query activity logs for */
  scope: ActivityLogScope;
  /** Default page size. @default 20 */
  defaultPageSize?: number;
  /**
   * Default resource filter(s) to apply.
   * When set, only these resources are shown.
   */
  defaultResource?: string | string[];
  /** Whether filters are hidden (disables filter state management) */
  hideFilters?: boolean;
}

export interface UseActivityLogTableReturn {
  // Data
  data: ReturnType<typeof useActivityLogs>['data'];

  // Loading states
  isLoading: boolean;
  isFetching: boolean;

  // Error state
  error: Error | null;

  // Filter state
  filters: FilterState;
  setFilters: (filters: FilterState) => void;

  // Time range
  startTime: string;
  endTime: string;

  // Pagination state
  pageSize: number;
  setPageSize: (size: number) => void;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;

  // Pagination actions
  goToNextPage: () => void;
  goToPrevPage: () => void;
  resetPagination: () => void;

  // Computed values
  effectiveResources: string[] | undefined;
}

// ============================================
// HOOK
// ============================================

/**
 * Manages all state for the ActivityLogTable component.
 *
 * Extracts filter management, date range handling, pagination state,
 * and the useActivityLogs query into a single reusable hook.
 *
 * @example
 * ```tsx
 * const table = useActivityLogTable({
 *   scope: { type: 'project', projectId },
 *   defaultPageSize: 20,
 * });
 *
 * return (
 *   <DataTable
 *     data={table.data}
 *     isLoading={table.isLoading}
 *     onFiltersChange={table.setFilters}
 *     // ...
 *   />
 * );
 * ```
 */
/**
 * Read initial filters from URL params
 * This ensures the first API call uses the correct filters
 */
function getInitialFiltersFromUrl(timezone: string): FilterState {
  if (typeof window === 'undefined') return {};

  const urlParams = new URLSearchParams(window.location.search);
  const initialFilters: FilterState = {};

  // Parse 'q' (search query)
  const q = urlParams.get('q');
  if (q) {
    initialFilters.q = q;
  }

  // Parse 'period' (time range)
  const periodParam = urlParams.get('period');
  if (periodParam) {
    const deserialized = deserializeTimeRange(periodParam);
    if (deserialized) {
      // If it's a preset without timestamps, calculate them now
      if (
        deserialized.type === 'preset' &&
        deserialized.preset &&
        (!deserialized.from || !deserialized.to)
      ) {
        const preset = getPresetByKey(deserialized.preset, DEFAULT_PRESETS);
        if (preset) {
          const range = getPresetRange(preset, timezone);
          initialFilters.period = {
            type: 'preset',
            preset: deserialized.preset,
            from: range.from,
            to: range.to,
          };
        }
      } else {
        initialFilters.period = deserialized;
      }
    }
  }

  // Parse 'actions' (array)
  const actions = urlParams.get('actions');
  if (actions) {
    initialFilters.actions = actions.split(',').filter(Boolean);
  }

  // Parse 'resources' (array)
  const resources = urlParams.get('resources');
  if (resources) {
    initialFilters.resources = resources.split(',').filter(Boolean);
  }

  return initialFilters;
}

export function useActivityLogTable(
  options: UseActivityLogTableOptions
): UseActivityLogTableReturn {
  const { scope, defaultPageSize = 20, defaultResource, hideFilters = false } = options;

  // ----------------------------------------
  // Time range handling
  // ----------------------------------------
  const { userPreferences } = useApp();
  const timezone = userPreferences?.timezone ?? getBrowserTimezone();

  // ----------------------------------------
  // Filter state - initialize from URL params
  // ----------------------------------------
  const [filters, setFilters] = useState<FilterState>(() => getInitialFiltersFromUrl(timezone));

  // Normalize defaultResource to array
  const effectiveResources = useMemo(() => {
    if (defaultResource) {
      return Array.isArray(defaultResource) ? defaultResource : [defaultResource];
    }
    return filters.resources;
  }, [defaultResource, filters.resources]);

  // Convert period filter to API format
  const { startTime, endTime } = useMemo(() => {
    // Pass null if no period - toApiTimeRange will use default preset
    return toApiTimeRange(filters.period ?? null, timezone);
  }, [filters.period, timezone]);

  // ----------------------------------------
  // Pagination state
  // ----------------------------------------
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  // ----------------------------------------
  // Query activity logs
  // ----------------------------------------
  const query = useActivityLogs(scope, {
    filters: {
      search: filters.q,
      actions: filters.actions,
      resources: effectiveResources,
    },
    startTime,
    endTime,
    pageSize,
  });

  // ----------------------------------------
  // Reset pagination when filters change
  // ----------------------------------------
  const prevFiltersRef = useRef({
    startTime,
    endTime,
    q: filters.q,
    actions: filters.actions,
    resources: filters.resources,
  });

  useEffect(() => {
    const prev = prevFiltersRef.current;
    const hasFilterChanged =
      prev.startTime !== startTime ||
      prev.endTime !== endTime ||
      prev.q !== filters.q ||
      JSON.stringify(prev.actions) !== JSON.stringify(filters.actions) ||
      JSON.stringify(prev.resources) !== JSON.stringify(filters.resources);

    if (hasFilterChanged) {
      query.resetPagination();
      prevFiltersRef.current = {
        startTime,
        endTime,
        q: filters.q,
        actions: filters.actions,
        resources: filters.resources,
      };
    }
  }, [startTime, endTime, filters.q, filters.actions, filters.resources, query]);

  // Page size change handler (resets pagination)
  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      query.resetPagination();
    },
    [query]
  );

  // ----------------------------------------
  // Smart filter setter that properly handles period deserialization
  // ----------------------------------------
  const handleSetFilters = useCallback(
    (newFilters: FilterState) => {
      setFilters((prevFilters) => {
        const merged = { ...prevFilters, ...newFilters };

        // If period is a raw string from DataTableContext, deserialize it
        if (merged.period && typeof merged.period === 'string') {
          const deserialized = deserializeTimeRange(merged.period as unknown as string);
          if (deserialized) {
            // If it's a preset without timestamps, calculate them
            if (
              deserialized.type === 'preset' &&
              deserialized.preset &&
              (!deserialized.from || !deserialized.to)
            ) {
              const preset = getPresetByKey(deserialized.preset, DEFAULT_PRESETS);
              if (preset) {
                const range = getPresetRange(preset, timezone);
                merged.period = {
                  type: 'preset',
                  preset: deserialized.preset,
                  from: range.from,
                  to: range.to,
                };
              }
            } else {
              merged.period = deserialized;
            }
          }
        }

        return merged;
      });
    },
    [timezone]
  );

  // ----------------------------------------
  // Return
  // ----------------------------------------
  return {
    // Data
    data: query.data,

    // Loading states
    isLoading: query.isLoading,
    isFetching: query.isFetching,

    // Error state
    error: query.error,

    // Filter state
    filters,
    setFilters: hideFilters ? () => {} : handleSetFilters,

    // Time range
    startTime,
    endTime,

    // Pagination state
    pageSize,
    setPageSize,
    page: query.page,
    hasNextPage: query.hasNextPage,
    hasPrevPage: query.hasPrevPage,

    // Pagination actions
    goToNextPage: query.goToNextPage,
    goToPrevPage: query.goToPrevPage,
    resetPagination: query.resetPagination,

    // Computed values
    effectiveResources,
  };
}
