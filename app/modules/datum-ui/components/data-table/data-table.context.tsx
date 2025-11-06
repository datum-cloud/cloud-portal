import { deserializeDateRange, isDateRangeFormat } from './utils/date-serialization';
import type {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  Table,
  VisibilityState,
} from '@tanstack/react-table';
import { parseAsString } from 'nuqs';
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  ReactNode,
  useRef,
  useEffect,
  useState,
} from 'react';

// Types for filter state
export type FilterValue = string | string[] | Date | { from?: Date; to?: Date } | null | undefined;

export interface FilterState {
  [key: string]: FilterValue;
}

// Parser types for nuqs integration
export type FilterParser = any; // Simplified type for now since nuqs parsers are complex

export interface FilterParserRegistry {
  [key: string]: FilterParser;
}

// Unified DataTable Context Interface
interface DataTableContextType<TData = unknown, TValue = unknown> {
  // Table instance and core props
  table: Table<TData>;
  columns: ColumnDef<TData, TValue>[];
  enableColumnOrdering: boolean;
  isLoading?: boolean;

  // Table state (controlled from useReactTable)
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  rowSelection: RowSelectionState;
  columnOrder: string[];
  columnVisibility: VisibilityState;

  // Table utilities
  getFacetedUniqueValues?: (table: Table<TData>, columnId: string) => Map<string, number>;
  getFacetedMinMaxValues?: (table: Table<TData>, columnId: string) => undefined | [number, number];

  // Filter state and actions
  filterState: FilterState;
  setFilter: (key: string, value: FilterValue) => void;
  resetFilter: (key: string) => void;
  resetAllFilters: () => void;

  // Filter utilities
  getFilterValue: <T = FilterValue>(key: string) => T;
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;

  // Parser registration
  registerFilterParser: (key: string, parser: FilterParser) => void;

  // Global search
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  resetGlobalFilter: () => void;
  globalSearchOptions: {
    searchableColumns?: string[];
    excludeColumns?: string[];
  };
  setGlobalSearchOptions: (options: {
    searchableColumns?: string[];
    excludeColumns?: string[];
  }) => void;
}

export const DataTableContext = createContext<DataTableContextType<any, any> | null>(null);

// Props for the unified provider
export interface DataTableProviderProps<TData, TValue> {
  children: ReactNode;

  // Table props
  table: Table<TData>;
  columns: ColumnDef<TData, TValue>[];
  enableColumnOrdering?: boolean;
  isLoading?: boolean;

  // Table state
  columnFilters: ColumnFiltersState;
  sorting: SortingState;
  rowSelection: RowSelectionState;
  columnOrder: string[];
  columnVisibility: VisibilityState;
  globalFilter: string;

  // Table utilities
  getFacetedUniqueValues?: (table: Table<TData>, columnId: string) => Map<string, number>;
  getFacetedMinMaxValues?: (table: Table<TData>, columnId: string) => undefined | [number, number];

  // Filter props
  onFiltersChange?: (filters: FilterState) => void;
  onFilteringStart?: () => void;
  onFilteringEnd?: () => void;
  defaultFilters?: FilterState;
  serverSideFiltering?: boolean;

  // Global search options ref
  globalSearchOptionsRef?: React.MutableRefObject<{
    searchableColumns?: string[];
    excludeColumns?: string[];
  }>;
}

export function DataTableProvider<TData, TValue>({
  children,
  table,
  columns,
  enableColumnOrdering = false,
  isLoading,
  columnFilters,
  sorting,
  rowSelection,
  columnOrder,
  columnVisibility,
  globalFilter,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  onFiltersChange,
  onFilteringStart,
  onFilteringEnd: _onFilteringEnd, // Prefix with _ to indicate intentionally unused (reserved for future use)
  defaultFilters = {},
  serverSideFiltering = false,
  globalSearchOptionsRef,
}: DataTableProviderProps<TData, TValue>) {
  // Registry for dynamic parser registration
  const parsersRef = useRef<FilterParserRegistry>({});

  // Global search options state
  const [globalSearchOptions, setGlobalSearchOptions] = useState<{
    searchableColumns?: string[];
    excludeColumns?: string[];
  }>({});

  // Update the ref when options change
  useEffect(() => {
    if (globalSearchOptionsRef) {
      globalSearchOptionsRef.current = globalSearchOptions;
    }
  }, [globalSearchOptions, globalSearchOptionsRef]);

  // Initialize common parsers
  useEffect(() => {
    // Pre-register common filter parsers
    parsersRef.current = {
      search: parseAsString.withDefault(''),
      // Add other common parsers as needed
    };
  }, []);

  // Filter state management with nuqs - using individual useQueryState for each filter
  const [internalFilterState, setInternalFilterState] = useState<FilterState>({});
  const [initialFiltersLoaded, setInitialFiltersLoaded] = useState(false);

  // Merge default filters with internal state
  const mergedFilterState = useMemo(
    () => ({
      ...defaultFilters,
      ...internalFilterState,
    }),
    [defaultFilters, internalFilterState]
  );

  // Handle initial filter state synchronization for server-side filtering using nuqs
  useEffect(() => {
    // Only run once, for server-side filtering, when we have an onFiltersChange callback
    if (!initialFiltersLoaded && serverSideFiltering && onFiltersChange) {
      // Use nuqs to directly read current URL search params
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlFilters: Record<string, any> = {};

        // Parse URL parameters into filter object
        for (const [key, value] of urlParams.entries()) {
          if (value && value.trim() !== '') {
            // Check if it's a date range format (timestamp_timestamp)
            if (isDateRangeFormat(value)) {
              urlFilters[key] = deserializeDateRange(value);
            } else {
              // Try to parse as JSON for complex values, otherwise use as string
              try {
                // Check if it looks like a JSON array or object
                if (value.startsWith('[') || value.startsWith('{')) {
                  urlFilters[key] = JSON.parse(value);
                } else {
                  urlFilters[key] = value;
                }
              } catch {
                // If JSON parsing fails, use as string
                urlFilters[key] = value;
              }
            }
          }
        }

        // If there are URL filters, call onFiltersChange
        if (Object.keys(urlFilters).length > 0) {
          onFiltersChange?.(urlFilters);
        }
      }

      setInitialFiltersLoaded(true);
    }
  }, [serverSideFiltering, onFiltersChange, initialFiltersLoaded]);

  // Filter actions
  // Register parser for dynamic nuqs integration
  const registerFilterParser = useCallback((key: string, parser: FilterParser) => {
    parsersRef.current[key] = parser;
  }, []);

  const setFilter = useCallback(
    (key: string, value: FilterValue) => {
      const newState = { [key]: value };
      const updatedFilterState = { ...mergedFilterState, ...newState };

      setInternalFilterState((prev) => ({ ...prev, ...newState }));

      // Update table column filter only for client-side filtering
      if (!serverSideFiltering) {
        table.getColumn(key)?.setFilterValue(value);
      }

      // Call filtering start callback for server-side filtering
      if (serverSideFiltering && onFilteringStart) {
        onFilteringStart();
      }

      // Always call onChange callback for API filtering or external handling
      onFiltersChange?.(updatedFilterState);
    },
    [table, onFiltersChange, onFilteringStart, mergedFilterState, serverSideFiltering]
  );

  const resetFilter = useCallback(
    (key: string) => {
      setFilter(key, null);
    },
    [setFilter]
  );

  const resetAllFilters = useCallback(() => {
    const resetState: FilterState = {};
    setInternalFilterState(resetState);

    // Reset table filters only for client-side filtering
    if (!serverSideFiltering) {
      table.resetColumnFilters();
      table.setGlobalFilter(''); // Reset global filter too
    }

    onFiltersChange?.(resetState);
  }, [table, onFiltersChange, serverSideFiltering]);

  // Global filter actions
  const setGlobalFilter = useCallback(
    (value: string) => {
      table.setGlobalFilter(value);
    },
    [table]
  );

  const resetGlobalFilter = useCallback(() => {
    table.setGlobalFilter('');
  }, [table]);

  // Filter utilities
  const getFilterValue = useCallback(
    <T = FilterValue,>(key: string): T => {
      return (mergedFilterState as Record<string, FilterValue>)[key] as T;
    },
    [mergedFilterState]
  );

  const hasActiveFilters = useCallback(() => {
    return Object.values(mergedFilterState).some((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value instanceof Date) return true;
      if (typeof value === 'object' && 'from' in value) {
        return Boolean(value.from || (value as { to?: unknown }).to);
      }
      return Boolean(value);
    });
  }, [mergedFilterState]);

  const getActiveFilterCount = useCallback(() => {
    return Object.values(mergedFilterState).filter((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value instanceof Date) return true;
      if (typeof value === 'object' && 'from' in value) {
        return Boolean(value.from || (value as { to?: unknown }).to);
      }
      return Boolean(value);
    }).length;
  }, [mergedFilterState]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    (): DataTableContextType<TData, TValue> => ({
      // Table props
      table,
      columns,
      enableColumnOrdering,
      isLoading,

      // Table state
      columnFilters,
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,

      // Table utilities
      getFacetedUniqueValues,
      getFacetedMinMaxValues,

      // Filter state and actions
      filterState: mergedFilterState,
      setFilter,
      resetFilter,
      resetAllFilters,

      // Filter utilities
      getFilterValue,
      hasActiveFilters,
      getActiveFilterCount,

      // Parser registration
      registerFilterParser,

      // Global search
      globalFilter,
      setGlobalFilter,
      resetGlobalFilter,
      globalSearchOptions,
      setGlobalSearchOptions,
    }),
    [
      // Table props
      table,
      columns,
      enableColumnOrdering,
      isLoading,

      // Table state
      columnFilters,
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,

      // Table utilities
      getFacetedUniqueValues,
      getFacetedMinMaxValues,

      // Filter state and actions
      mergedFilterState,
      setFilter,
      resetFilter,
      resetAllFilters,

      // Filter utilities
      getFilterValue,
      hasActiveFilters,
      getActiveFilterCount,

      // Parser registration
      registerFilterParser,

      // Global search
      globalFilter,
      setGlobalFilter,
      resetGlobalFilter,
      globalSearchOptions,
      setGlobalSearchOptions,
    ]
  );

  return <DataTableContext.Provider value={contextValue}>{children}</DataTableContext.Provider>;
}

// Main hook for accessing the unified context
export function useDataTable<TData = unknown, TValue = unknown>(): DataTableContextType<
  TData,
  TValue
> {
  const context = useContext(DataTableContext);

  if (!context) {
    throw new Error('useDataTable must be used within a DataTableProvider');
  }

  return context as DataTableContextType<TData, TValue>;
}

// Backward compatibility - filter-specific hook
export function useDataTableFilter(): Pick<
  DataTableContextType,
  | 'filterState'
  | 'setFilter'
  | 'resetFilter'
  | 'resetAllFilters'
  | 'getFilterValue'
  | 'hasActiveFilters'
  | 'getActiveFilterCount'
  | 'registerFilterParser'
  | 'table'
> {
  const context = useDataTable();

  return {
    filterState: context.filterState,
    setFilter: context.setFilter,
    resetFilter: context.resetFilter,
    resetAllFilters: context.resetAllFilters,
    getFilterValue: context.getFilterValue,
    hasActiveFilters: context.hasActiveFilters,
    getActiveFilterCount: context.getActiveFilterCount,
    registerFilterParser: context.registerFilterParser,
    table: context.table,
  };
}

// Hook for individual filter components - optimized with memoization
export function useFilter<T = FilterValue>(key: string) {
  const { getFilterValue, setFilter, resetFilter } = useDataTable();

  // Memoize the current value to prevent unnecessary re-renders
  const value = useMemo(() => getFilterValue<T>(key), [getFilterValue, key]);

  // Memoize setValue function
  const setValue = useCallback(
    (newValue: T) => {
      setFilter(key, newValue as FilterValue);
    },
    [key, setFilter]
  );

  // Memoize reset function
  const reset = useCallback(() => {
    resetFilter(key);
  }, [key, resetFilter]);

  return useMemo(
    () => ({
      value,
      setValue,
      reset,
    }),
    [value, setValue, reset]
  );
}

// Performance optimization: Selector hook for specific table data
export function useTableData<TData = unknown>() {
  const { table } = useDataTable<TData>();

  return useMemo(
    () => ({
      rows: table.getRowModel().rows,
      pageCount: table.getPageCount(),
      canPreviousPage: table.getCanPreviousPage(),
      canNextPage: table.getCanNextPage(),
      pageIndex: table.getState().pagination.pageIndex,
      pageSize: table.getState().pagination.pageSize,
    }),
    [table]
  );
}

// Performance optimization: Selector hook for filter-related data only
export function useFilterData() {
  const context = useDataTable();

  return useMemo(
    () => ({
      filterState: context.filterState,
      hasActiveFilters: context.hasActiveFilters(),
      activeFilterCount: context.getActiveFilterCount(),
      setFilter: context.setFilter,
      resetFilter: context.resetFilter,
      resetAllFilters: context.resetAllFilters,
    }),
    [
      context.filterState,
      context.hasActiveFilters,
      context.getActiveFilterCount,
      context.setFilter,
      context.resetFilter,
      context.resetAllFilters,
    ]
  );
}

// Performance optimization: Selector hook for table state only
export function useTableState() {
  const context = useDataTable();

  return useMemo(
    () => ({
      columnFilters: context.columnFilters,
      sorting: context.sorting,
      rowSelection: context.rowSelection,
      columnOrder: context.columnOrder,
      columnVisibility: context.columnVisibility,
    }),
    [
      context.columnFilters,
      context.sorting,
      context.rowSelection,
      context.columnOrder,
      context.columnVisibility,
    ]
  );
}
