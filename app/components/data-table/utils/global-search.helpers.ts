import type { ColumnDef, Row } from '@tanstack/react-table';

/**
 * Global search utilities for DataTable
 * Provides functions to search across multiple columns with various strategies
 */

export type MatchMode = 'contains' | 'startsWith' | 'exact';

export interface GlobalSearchOptions {
  searchableColumns?: string[];
  excludeColumns?: string[];
  caseSensitive?: boolean;
  matchMode?: MatchMode;
  searchNestedFields?: boolean;
}

/**
 * Normalize search string for comparison
 */
export function normalizeSearchString(value: string, caseSensitive: boolean): string {
  if (!value) return '';
  const normalized = value.trim();
  return caseSensitive ? normalized : normalized.toLowerCase();
}

/**
 * Match search term against value based on match mode
 */
export function matchSearchTerm(value: string, searchTerm: string, mode: MatchMode): boolean {
  if (!value || !searchTerm) return false;

  switch (mode) {
    case 'startsWith':
      return value.startsWith(searchTerm);
    case 'exact':
      return value === searchTerm;
    case 'contains':
    default:
      return value.includes(searchTerm);
  }
}

/**
 * Extract value from nested object using dot notation path
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }

  return value;
}

/**
 * Convert any value to searchable string
 */
export function valueToSearchableString(value: any): string {
  if (value === null || value === undefined) return '';

  // Handle arrays
  if (Array.isArray(value)) {
    return value
      .map((item) => valueToSearchableString(item))
      .filter(Boolean)
      .join(' ');
  }

  // Handle objects (extract all string values)
  if (typeof value === 'object') {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Extract all values from object
    return Object.values(value)
      .map((v) => valueToSearchableString(v))
      .filter(Boolean)
      .join(' ');
  }

  // Handle primitives
  return String(value);
}

/**
 * Check if a column is searchable based on its definition
 */
export function isColumnSearchable<TData>(column: ColumnDef<TData, any>): boolean {
  // Check meta.searchable flag
  if (column.meta?.searchable === false) {
    return false;
  }

  // If explicitly marked as searchable
  if (column.meta?.searchable === true) {
    return true;
  }

  // Auto-detect: has accessorKey or accessorFn
  if ('accessorKey' in column || 'accessorFn' in column) {
    return true;
  }

  return false;
}

/**
 * Get searchable columns from column definitions
 */
export function getSearchableColumns<TData>(
  columns: ColumnDef<TData, any>[],
  options: GlobalSearchOptions = {}
): ColumnDef<TData, any>[] {
  const { searchableColumns, excludeColumns = [] } = options;

  // Filter columns
  let filtered = columns.filter((col) => {
    const columnId = col.id || (col as any).accessorKey;
    if (!columnId) return false;

    // Always respect meta.searchable = false (highest priority)
    if (col.meta?.searchable === false) {
      return false;
    }

    // Exclude specified columns
    if (excludeColumns.includes(columnId)) {
      return false;
    }

    // If searchableColumns specified, only include those
    if (searchableColumns && searchableColumns.length > 0) {
      return searchableColumns.includes(columnId);
    }

    // Otherwise, auto-detect searchable columns
    return isColumnSearchable(col);
  });

  return filtered;
}

/**
 * Extract searchable value from row for a specific column
 */
export function extractSearchableValue<TData>(
  row: Row<TData>,
  column: ColumnDef<TData, any>,
  options: GlobalSearchOptions = {}
): string {
  const { searchNestedFields = true } = options;

  // Use custom search transform if provided
  if (column.meta?.searchTransform) {
    const value = row.getValue(column.id!);
    return valueToSearchableString(column.meta.searchTransform(value));
  }

  // Use custom search path if provided
  if (column.meta?.searchPath) {
    const paths = Array.isArray(column.meta.searchPath)
      ? column.meta.searchPath
      : [column.meta.searchPath];

    const values = paths.map((path) => getNestedValue(row.original, path));
    return valueToSearchableString(values);
  }

  // Get value using column's accessor
  const columnId = column.id || (column as any).accessorKey;
  if (!columnId) return '';

  try {
    const value = row.getValue(columnId);

    // If nested fields disabled and value is object, skip
    if (!searchNestedFields && typeof value === 'object' && value !== null) {
      return '';
    }

    return valueToSearchableString(value);
  } catch {
    // Fallback: try to get value from original data using accessorKey
    const accessorKey = (column as any).accessorKey;
    if (accessorKey) {
      const value = getNestedValue(row.original, accessorKey);
      return valueToSearchableString(value);
    }

    // Last resort: try using columnId as path
    const value = getNestedValue(row.original, columnId);
    return valueToSearchableString(value);
  }
}

/**
 * Create global search filter function for TanStack Table
 *
 * @param columns - Column definitions
 * @param options - Static options (caseSensitive, matchMode, searchNestedFields)
 * @param getOptionsRef - Function to get dynamic options (searchableColumns, excludeColumns)
 */
export function createGlobalSearchFilter<TData>(
  columns: ColumnDef<TData, any>[],
  options: GlobalSearchOptions = {},
  getOptionsRef?: () => { searchableColumns?: string[]; excludeColumns?: string[] }
) {
  const { caseSensitive = false, matchMode = 'contains', searchNestedFields = true } = options;

  // Return filter function
  return (row: Row<TData>, columnId: string, filterValue: string): boolean => {
    // Empty search shows all rows
    if (!filterValue || filterValue.trim() === '') {
      return true;
    }

    // Get dynamic options at runtime
    const dynamicOptions = getOptionsRef?.() || {};
    const columnsToSearch = getSearchableColumns(columns, {
      searchableColumns: dynamicOptions.searchableColumns || options.searchableColumns,
      excludeColumns: dynamicOptions.excludeColumns || options.excludeColumns,
    });

    const normalizedSearchTerm = normalizeSearchString(filterValue, caseSensitive);

    // Search across all searchable columns
    for (const column of columnsToSearch) {
      const searchableValue = extractSearchableValue(row, column, {
        searchNestedFields,
      });

      const normalizedValue = normalizeSearchString(searchableValue, caseSensitive);

      // Check if matches
      if (matchSearchTerm(normalizedValue, normalizedSearchTerm, matchMode)) {
        return true; // Found match, include this row
      }
    }

    // No matches found
    return false;
  };
}

/**
 * Get list of column IDs that will be searched
 * Useful for displaying which columns are being searched
 */
export function getSearchableColumnIds<TData>(
  columns: ColumnDef<TData, any>[],
  options: GlobalSearchOptions = {}
): string[] {
  const searchableColumns = getSearchableColumns(columns, options);
  return searchableColumns
    .map((col) => col.id || (col as any).accessorKey)
    .filter(Boolean) as string[];
}

/**
 * Get human-readable column names for display
 */
export function getSearchableColumnNames<TData>(
  columns: ColumnDef<TData, any>[],
  options: GlobalSearchOptions = {}
): string[] {
  const searchableColumns = getSearchableColumns(columns, options);
  return searchableColumns
    .map((col) => {
      if (typeof col.header === 'string') {
        return col.header;
      }
      return col.id || (col as any).accessorKey;
    })
    .filter(Boolean) as string[];
}
