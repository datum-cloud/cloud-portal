import { useDataTable } from '../../core/data-table.context';
import { DataTableSearchConfig } from '../../core/data-table.types';
import { GlobalSearchFilter } from '../filter/components/global-search';
import { SearchFilter } from '../filter/components/search';
import { cn } from '@shadcn/lib/utils';

export interface DataTableToolbarSearchProps {
  config: DataTableSearchConfig;
  className?: string;
}

/**
 * DataTableToolbarSearch
 *
 * Built-in search component for the DataTable toolbar.
 * Automatically uses the appropriate filter component based on mode and serverSideFiltering:
 * - Default: GlobalSearchFilter (multi-column client-side search)
 * - serverSideFiltering=true → SearchFilter (single column server-side)
 * - mode='search' → SearchFilter (single column)
 *
 * Features:
 * - Reuses existing filter components
 * - Automatic mode selection based on filtering strategy
 * - Consistent behavior with other filters
 */
export const DataTableToolbarSearch = ({ config, className }: DataTableToolbarSearchProps) => {
  const { serverSideFiltering } = useDataTable();

  const {
    placeholder = 'Search...',
    filterKey = 'q',
    debounce = 300,
    mode = 'global-search', // Default to global-search
    searchableColumns,
  } = config;

  // Determine which search component to use:
  // 1. If mode is explicitly set to 'search', use SearchFilter (single column)
  // 2. If serverSideFiltering=true, use SearchFilter (server handles search logic)
  // 3. Otherwise (default), use GlobalSearchFilter (multi-column client-side)
  const useGlobalSearch = mode !== 'search' && !serverSideFiltering;

  if (useGlobalSearch) {
    // Client-side global search across multiple columns
    return (
      <GlobalSearchFilter
        placeholder={placeholder}
        debounceMs={debounce}
        searchableColumns={searchableColumns}
        className={cn('max-w-md flex-1', className)}
        inputClassName="h-9"
      />
    );
  }

  // Server-side or single-column search
  return (
    <SearchFilter
      filterKey={filterKey}
      placeholder={placeholder}
      debounceMs={debounce}
      className={cn('max-w-md flex-1', className)}
      inputClassName="h-9"
    />
  );
};
