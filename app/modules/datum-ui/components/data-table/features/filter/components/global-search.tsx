import { useDataTable } from '../../../core/data-table.context';
import { useStringFilter } from '../../../hooks/useFilterQueryState';
import {
  getSearchableColumnIds,
  getSearchableColumnNames,
} from '../../../utils/global-search.helpers';
import { SearchInput } from './shared/search-input';
import { useSearchState } from './shared/use-search-state';
import { cn } from '@shadcn/lib/utils';
import { useMemo, useEffect } from 'react';

/**
 * Global Search Filter Component
 * Searches across multiple columns simultaneously
 *
 * @example
 * // Basic usage - searches all searchable columns
 * <DataTableFilter.GlobalSearch placeholder="Search everything..." />
 *
 * @example
 * // Explicit columns
 * <DataTableFilter.GlobalSearch
 *   searchableColumns={['name', 'email', 'company.name']}
 *   placeholder="Search name, email, or company..."
 * />
 *
 * @example
 * // Exclude specific columns
 * <DataTableFilter.GlobalSearch
 *   excludeColumns={['id', 'createdAt']}
 *   placeholder="Search all except ID and dates..."
 * />
 *
 * @example
 * // Custom filterKey for URL sync
 * <DataTableFilter.GlobalSearch
 *   filterKey="search"
 *   placeholder="Search..."
 * />
 */
export interface GlobalSearchFilterProps {
  // Filter key for URL sync (default: 'q')
  filterKey?: string;

  // Column selection
  searchableColumns?: string[];
  excludeColumns?: string[];

  // UI props
  label?: string;
  placeholder?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  debounceMs?: number;
  immediate?: boolean;
  inputClassName?: string;

  // Display options
  showSearchingColumns?: boolean; // Show which columns are being searched
}

export function GlobalSearchFilter({
  filterKey = 'q',
  label,
  placeholder = 'Search...',
  description,
  className,
  inputClassName,
  disabled = false,
  debounceMs = 300,
  immediate = false,
  searchableColumns,
  excludeColumns,
  showSearchingColumns = false,
}: GlobalSearchFilterProps) {
  const { columns, globalFilter, setGlobalFilter, setGlobalSearchOptions } = useDataTable();

  // Use useStringFilter for URL sync via nuqs
  const { value: urlValue, setValue: setUrlValue } = useStringFilter(filterKey);

  // Update global search options when props change
  useEffect(() => {
    setGlobalSearchOptions({
      searchableColumns,
      excludeColumns,
    });
  }, [searchableColumns, excludeColumns, setGlobalSearchOptions]);

  // Sync URL value to table's globalFilter on initial load
  useEffect(() => {
    if (urlValue && urlValue !== globalFilter) {
      setGlobalFilter(urlValue);
    }
  }, [urlValue, globalFilter, setGlobalFilter]);

  // Get searchable column information
  const searchInfo = useMemo(() => {
    const columnIds = getSearchableColumnIds(columns, {
      searchableColumns,
      excludeColumns,
    });

    const columnNames = getSearchableColumnNames(columns, {
      searchableColumns,
      excludeColumns,
    });

    return { columnIds, columnNames };
  }, [columns, searchableColumns, excludeColumns]);

  // Combined handler that updates both URL (nuqs) and table globalFilter
  const handleDebouncedChange = (value: string) => {
    setUrlValue(value); // Update URL via nuqs
    setGlobalFilter(value); // Update table's globalFilter for actual filtering
  };

  // Use shared search state hook
  const { localValue, handleChange, handleClear } = useSearchState({
    initialValue: urlValue || globalFilter || '',
    debounceMs,
    immediate,
    onDebouncedChange: handleDebouncedChange,
  });

  // Build description with searchable columns info
  const enhancedDescription = useMemo(() => {
    if (description) return description;

    if (showSearchingColumns && searchInfo.columnNames.length > 0) {
      const columnList = searchInfo.columnNames.slice(0, 3).join(', ');
      const remaining = searchInfo.columnNames.length - 3;

      if (remaining > 0) {
        return `Searching: ${columnList}, +${remaining} more`;
      }
      return `Searching: ${columnList}`;
    }

    return undefined;
  }, [description, showSearchingColumns, searchInfo.columnNames]);

  return (
    <SearchInput
      id="global-search"
      value={localValue}
      onChange={handleChange}
      onClear={handleClear}
      placeholder={placeholder}
      label={label}
      description={enhancedDescription}
      disabled={disabled}
      className={cn('min-w-full md:min-w-80', className)} // Wider than single-column search
      inputClassName={inputClassName}
    />
  );
}
