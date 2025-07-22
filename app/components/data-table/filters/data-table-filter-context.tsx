'use client';

import { FilterContextValue } from './types';
import { createContext, useContext } from 'react';

export const FilterContext = createContext<FilterContextValue | null>(null);

/**
 * Hook to access filter context within DataTableFilter components
 *
 * @returns FilterContextValue containing filter state and methods
 * @throws Error if used outside DataTableFilter provider
 *
 * @example
 * ```tsx
 * const CustomFilterComponent = () => {
 *   const { filters, updateFilter, clearFilter } = useFilterContext();
 *
 *   return (
 *     <button onClick={() => updateFilter('status', 'active')}>
 *       Set Active Status
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
 * Hook to get a specific filter value
 *
 * @param filterKey - The key of the filter to get
 * @returns The current value of the specified filter
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
  const { filters } = useFilterContext();
  return filters[filterKey];
};

/**
 * Hook to get filter update function for a specific key
 *
 * @param filterKey - The key of the filter to update
 * @returns Function to update the specified filter
 *
 * @example
 * ```tsx
 * const QuickStatusFilter = () => {
 *   const updateStatus = useFilterUpdater('status');
 *
 *   return (
 *     <div>
 *       <button onClick={() => updateStatus('active')}>Active</button>
 *       <button onClick={() => updateStatus('inactive')}>Inactive</button>
 *     </div>
 *   );
 * };
 * ```
 */
export const useFilterUpdater = (filterKey: string) => {
  const { updateFilter } = useFilterContext();
  return (value: any) => updateFilter(filterKey, value);
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
  const { filters } = useFilterContext();
  return Object.keys(filters).length > 0;
};
