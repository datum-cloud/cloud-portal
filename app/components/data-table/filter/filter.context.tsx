import { Table } from '@tanstack/react-table';
import { useQueryStates } from 'nuqs';
import { parseAsString, parseAsArrayOf, parseAsIsoDateTime } from 'nuqs';
import { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';

// Types for filter state
export type FilterValue = string | string[] | Date | { from?: Date; to?: Date } | null | undefined;

export interface FilterState {
  [key: string]: FilterValue;
}

export interface FilterContextValue {
  // State
  filterState: FilterState;

  // Actions
  setFilter: (key: string, value: FilterValue) => void;
  resetFilter: (key: string) => void;
  resetAllFilters: () => void;

  // Utilities
  getFilterValue: <T = FilterValue>(key: string) => T;
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;

  // Table integration
  table?: Table<any>;
}

const FilterContext = createContext<FilterContextValue | null>(null);

// Parser factory for different filter types
const createParser = (type: 'string' | 'array' | 'date', defaultValue?: any) => {
  switch (type) {
    case 'string':
      return parseAsString.withDefault(defaultValue || '');
    case 'array':
      return parseAsArrayOf(parseAsString).withDefault(defaultValue || []);
    case 'date':
      return parseAsIsoDateTime;
    default:
      return parseAsString.withDefault('');
  }
};

export interface FilterProviderProps {
  children: ReactNode;
  table?: Table<any>;
  onFiltersChange?: (filters: FilterState) => void;
  defaultFilters?: FilterState;
}

export function DataTableFilterProvider({
  children,
  table,
  onFiltersChange,
  defaultFilters = {},
}: FilterProviderProps) {
  // Initialize parsers for known filter keys
  const [filterState, setFilterState] = useQueryStates(
    {
      // We'll dynamically add parsers as filters are registered
    },
    {
      shallow: false,
      history: 'push',
    }
  );

  // Merge default filters with URL state
  const mergedState = useMemo(
    () => ({
      ...defaultFilters,
      ...filterState,
    }),
    [defaultFilters, filterState]
  );

  const setFilter = useCallback(
    (key: string, value: FilterValue) => {
      const newState = { [key]: value };
      setFilterState(newState);

      // Update table column filter if table is provided
      if (table) {
        table.getColumn(key)?.setFilterValue(value);
      }

      // Call onChange callback
      onFiltersChange?.({ ...mergedState, ...newState });
    },
    [setFilterState, table, onFiltersChange, mergedState]
  );

  const resetFilter = useCallback(
    (key: string) => {
      setFilter(key, null);
    },
    [setFilter]
  );

  const resetAllFilters = useCallback(() => {
    const resetState: Record<string, null> = {};
    Object.keys(mergedState).forEach((key) => {
      resetState[key] = null;
    });
    setFilterState(resetState);

    // Reset table filters
    if (table) {
      table.resetColumnFilters();
    }

    onFiltersChange?.(resetState);
  }, [mergedState, setFilterState, table, onFiltersChange]);

  const getFilterValue = useCallback(
    <T = FilterValue,>(key: string): T => {
      return (mergedState as Record<string, FilterValue>)[key] as T;
    },
    [mergedState]
  );

  const hasActiveFilters = useCallback(() => {
    return Object.values(mergedState).some((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value instanceof Date) return true;
      if (typeof value === 'object' && 'from' in value) {
        return Boolean(value.from || (value as { to?: unknown }).to);
      }
      return Boolean(value);
    });
  }, [mergedState]);

  const getActiveFilterCount = useCallback(() => {
    return Object.values(mergedState).filter((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value instanceof Date) return true;
      if (typeof value === 'object' && 'from' in value) {
        return Boolean(value.from || (value as { to?: unknown }).to);
      }
      return Boolean(value);
    }).length;
  }, [mergedState]);

  const contextValue: FilterContextValue = {
    filterState: mergedState,
    setFilter,
    resetFilter,
    resetAllFilters,
    getFilterValue,
    hasActiveFilters,
    getActiveFilterCount,
    table,
  };

  return <FilterContext.Provider value={contextValue}>{children}</FilterContext.Provider>;
}

export function useDataTableFilter(): FilterContextValue {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useDataTableFilter must be used within a DataTableFilterProvider');
  }
  return context;
}

// Hook for individual filter components
export function useFilter<T = FilterValue>(key: string) {
  const { getFilterValue, setFilter, resetFilter } = useDataTableFilter();

  const value = getFilterValue<T>(key);

  const setValue = useCallback(
    (newValue: T) => {
      setFilter(key, newValue as FilterValue);
    },
    [key, setFilter]
  );

  const reset = useCallback(() => {
    resetFilter(key);
  }, [key, resetFilter]);

  return {
    value,
    setValue,
    reset,
  };
}
