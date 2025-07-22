'use client';

import { FilterContextValue } from './types';
import { createContext, useContext } from 'react';

export const FilterContext = createContext<FilterContextValue | null>(null);

/**
 * Hook to access filter context within DataTableFilter components
 *
 * @returns FilterContextValue containing utility functions
 * @throws Error if used outside DataTableFilter provider
 *
 * @example
 * ```tsx
 * const CustomFilterComponent = () => {
 *   const { getActiveFilters, clearAllFilters } = useFilterContext();
 *
 *   return (
 *     <button onClick={clearAllFilters}>
 *       Clear All ({Object.keys(getActiveFilters()).length})
 *     </button>
 *   );
 * };
 * ```
 */
export const useFilterContext = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('Filter components must be used within DataTableFilter');
  }
  return context;
};

/**
 * Hook to get a specific filter value from URL
 *
 * @param filterKey - The key of the filter to get
 * @returns The current value of the specified filter from URL
 *
 * @example
 * ```tsx
 * const SearchDisplay = () => {
 *   const searchValue = useFilterValue('search');
 *   return <span>Current search: {searchValue || 'None'}</span>;
 * };
 * ```
 */
export const useFilterValue = (filterKey: string) => {
  const { getFilterValue } = useFilterContext();
  return getFilterValue(filterKey);
};

/**
 * Hook to register a filter and get its updater function
 * This is used internally by filter components
 *
 * @param filterKey - The key of the filter to register
 * @returns Function to update the specified filter
 */
export const useFilterUpdater = (filterKey: string) => {
  const { registerFilter, getFilterValue } = useFilterContext();

  // Register this filter key with the context
  registerFilter(filterKey);

  // Return a function that can be used to update this filter
  // Note: The actual update will be handled by the filter component's nuqs
  return (value: any) => {
    // This is a placeholder - actual updates happen in individual components
    // The context will be notified through URL changes
  };
};

/**
 * Hook to get filter clear function for a specific key
 *
 * @param filterKey - The key of the filter to clear
 * @returns Function to clear the specified filter
 *
 * @example
 * ```tsx
 * const ClearableFilter = ({ filterKey }: { filterKey: string }) => {
 *   const clearFilter = useFilterClearer(filterKey);
 *   const filterValue = useFilterValue(filterKey);
 *
 *   return (
 *     <div>
 *       <span>Filter: {filterValue}</span>
 *       {filterValue && (
 *         <button onClick={clearFilter}>Clear</button>
 *       )}
 *     </div>
 *   );
 * };
 * ```
 */
export const useFilterClearer = (filterKey: string) => {
  const { clearFilter } = useFilterContext();
  return () => clearFilter(filterKey);
};

/**
 * Hook to check if any filters are active
 *
 * @returns Boolean indicating if any filters have values
 *
 * @example
 * ```tsx
 * const FilterStatus = () => {
 *   const hasActiveFilters = useHasActiveFilters();
 *   const { clearAllFilters } = useFilterContext();
 *
 *   return hasActiveFilters ? (
 *     <button onClick={clearAllFilters}>Clear All Filters</button>
 *   ) : (
 *     <span>No active filters</span>
 *   );
 * };
 * ```
 */
export const useHasActiveFilters = () => {
  const { getActiveFilters } = useFilterContext();
  const activeFilters = getActiveFilters();
  return Object.keys(activeFilters).length > 0;
};
