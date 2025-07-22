import { FilterContext } from './data-table-filter-context';
import { FilterCustom } from './data-table-filter-custom';
import { FilterDatePicker } from './data-table-filter-date-picker';
import { FilterSearch } from './data-table-filter-search';
import { FilterSelect } from './data-table-filter-select';
import { DataTableFilterProps, FilterValue } from './types';
import { cn } from '@/utils/misc';
import { useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export const DataTableFilter = ({ onFiltersChange, children, className }: DataTableFilterProps) => {
  // Registry to keep track of registered filter keys
  const registeredFilters = useRef<Set<string>>(new Set());

  // Use nuqs to read current URL state for utility functions
  const [urlState] = useQueryStates({}, { shallow: false });

  const registerFilter = useCallback((key: string) => {
    registeredFilters.current.add(key);
  }, []);

  const getFilterValue = useCallback(
    (key: string) => {
      return (urlState as Record<string, any>)[key];
    },
    [urlState]
  );

  const getActiveFilters = useCallback((): FilterValue => {
    const activeFilters: FilterValue = {};
    registeredFilters.current.forEach((key) => {
      const value = (urlState as Record<string, any>)[key];
      if (value !== null && value !== '' && value !== undefined) {
        activeFilters[key] = value;
      }
    });
    return activeFilters;
  }, [urlState]);

  const clearFilter = useCallback((key: string) => {
    // This will be handled by individual filter components
    // We just trigger a URL update
    const newState = { [key]: null };
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${new URLSearchParams(
        Object.entries({
          ...Object.fromEntries(new URLSearchParams(window.location.search)),
          ...newState,
        })
          .filter(([, value]) => value !== null && value !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()}`
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    // Clear all registered filters
    const clearedState: Record<string, null> = {};
    registeredFilters.current.forEach((key) => {
      clearedState[key] = null;
    });

    // Update URL without any filter parameters
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  // Call the callback when URL state changes
  useEffect(() => {
    const activeFilters = getActiveFilters();
    onFiltersChange?.(activeFilters);
  }, [urlState, onFiltersChange, getActiveFilters]);

  const contextValue = useMemo(
    () => ({
      registerFilter,
      getFilterValue,
      getActiveFilters,
      clearFilter,
      clearAllFilters,
    }),
    [registerFilter, getFilterValue, getActiveFilters, clearFilter, clearAllFilters]
  );

  return (
    <FilterContext.Provider value={contextValue}>
      <div className={cn('flex flex-wrap items-center gap-4', className)}>{children}</div>
    </FilterContext.Provider>
  );
};

// Attach child components as static properties
DataTableFilter.Search = FilterSearch;
DataTableFilter.Select = FilterSelect;
DataTableFilter.DatePicker = FilterDatePicker;
DataTableFilter.Custom = FilterCustom;
