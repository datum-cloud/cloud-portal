import { FilterContext } from './data-table-filter-context';
import { FilterCustom } from './data-table-filter-custom';
import { FilterDatePicker } from './data-table-filter-date-picker';
// Import child components
import { FilterSearch } from './data-table-filter-search';
import { FilterSelect } from './data-table-filter-select';
import { DataTableFilterProps, FilterValue } from './types';
import { cn } from '@/utils/misc';
import { useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';

export const DataTableFilter = ({ onFiltersChange, children, className }: DataTableFilterProps) => {
  // Use nuqs to manage all filter states in URL
  // Using an empty object allows dynamic filter keys to be added at runtime
  const [filters, setFilters] = useQueryStates(
    {},
    {
      shallow: false,
      throttleMs: 300,
    }
  );

  const updateFilter = useCallback(
    (key: string, value: any) => {
      const newValue = value === '' || value === null || value === undefined ? null : value;
      setFilters({ [key]: newValue });
    },
    [setFilters]
  );

  const clearFilter = useCallback(
    (key: string) => {
      setFilters({ [key]: null });
    },
    [setFilters]
  );

  const clearAllFilters = useCallback(() => {
    const clearedFilters = Object.keys(filters).reduce((acc, key) => ({ ...acc, [key]: null }), {});
    setFilters(clearedFilters);
  }, [filters, setFilters]);

  // Convert filters to the expected format and call callback
  const processedFilters: FilterValue = useMemo(() => {
    return Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== null && value !== '' && value !== undefined) {
        // Ensure value matches FilterValue type
        acc[key] = value as string | string[] | Date | null | undefined;
      }
      return acc;
    }, {} as FilterValue);
  }, [filters]);

  // Call the callback when filters change
  useEffect(() => {
    onFiltersChange?.(processedFilters);
  }, [processedFilters, onFiltersChange]);

  const contextValue = useMemo(
    () => ({
      filters: processedFilters,
      updateFilter,
      clearFilter,
      clearAllFilters,
    }),
    [processedFilters, updateFilter, clearFilter, clearAllFilters]
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
