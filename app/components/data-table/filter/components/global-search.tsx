import { useDataTable } from '../../data-table.context';
import {
  getSearchableColumnIds,
  getSearchableColumnNames,
} from '../../utils/global-search.helpers';
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
 */
export interface GlobalSearchFilterProps {
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

  // Update global search options when props change
  useEffect(() => {
    setGlobalSearchOptions({
      searchableColumns,
      excludeColumns,
    });
  }, [searchableColumns, excludeColumns, setGlobalSearchOptions]);

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

  // Use shared search state hook
  const { localValue, handleChange, handleClear } = useSearchState({
    initialValue: globalFilter || '',
    debounceMs,
    immediate,
    onDebouncedChange: setGlobalFilter,
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
      className={cn('min-w-80', className)} // Wider than single-column search
      inputClassName={inputClassName}
    />
  );
}
