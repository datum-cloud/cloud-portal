// =============================================================================
// DataTable Main Exports
// =============================================================================
// This is the main entry point for the DataTable component system.
// It exports all components, types, hooks, and utilities needed to use the DataTable.

// =============================================================================
// Core Components
// =============================================================================

// Main DataTable component and provider
export { DataTable } from './data-table';
export { DataTableProvider } from './data-table.context';

// Table sub-components
export { DataTableHeader } from './data-table-header';
export { DataTablePagination } from './data-table-pagination';
export { DataTableRowActions } from './data-table-row-actions';
export { DataTableLoadingContent } from './data-table-loading';

// =============================================================================
// Core Types
// =============================================================================

// Main component types
export type {
  DataTableProps,
  DataTableRowActionsProps,
  DataTableTitleProps,
  DataTableEmptyContentProps,
  SearchParams,
} from './data-table.types';

// Context types
export type {
  FilterValue,
  FilterState,
  FilterParser,
  FilterParserRegistry,
  DataTableProviderProps,
} from './data-table.context';

// =============================================================================
// Core Context & Hooks
// =============================================================================

// Context
export { DataTableContext } from './data-table.context';

// Core hooks
export {
  useDataTable,
  useDataTableFilter,
  useFilter,
  useTableData,
  useFilterData,
  useTableState,
} from './data-table.context';

// =============================================================================
// URL-aware Filter Hooks
// =============================================================================

// Advanced filter hooks with URL state management
export {
  useFilterQueryState,
  useStringFilter,
  useArrayFilter,
  useDateFilter,
  useDateRangeFilter,
} from './hooks/useFilterQueryState';

// =============================================================================
// Filter System
// =============================================================================

// Main filter component and individual filter components
export {
  DataTableFilter,
  SearchFilter,
  GlobalSearchFilter,
  DatePickerFilter,
  SelectFilter,
  RadioFilter,
  CheckboxFilter,
} from './filter/data-table-filter';

// Filter component types
export type { DataTableFilterProps } from './filter/data-table-filter';
export type { SearchFilterProps } from './filter/components/search';
export type { GlobalSearchFilterProps } from './filter/components/global-search';
export type { DatePickerFilterProps } from './filter/components/datepicker';
export type { SelectFilterProps, SelectOption } from './filter/components/select';
export type { RadioFilterProps, RadioOption } from './filter/components/radio';
export type { CheckboxFilterProps, CheckboxOption } from './filter/components/checkbox';

// =============================================================================
// Re-exports for Convenience
// =============================================================================

// Re-export everything from filter for backward compatibility
// This ensures existing imports from '@/components/data-table/filter' continue to work
export * from './filter';

// =============================================================================
// Utilities
// =============================================================================

// Date serialization utilities for filter state management
export {
  serializeDateRange,
  deserializeDateRange,
  serializeDate,
  deserializeDate,
  isDateRangeFormat,
} from './utils/date-serialization';

// Global search utilities
export {
  createGlobalSearchFilter,
  getSearchableColumns,
  getSearchableColumnIds,
  getSearchableColumnNames,
  isColumnSearchable,
  extractSearchableValue,
  valueToSearchableString,
  type GlobalSearchOptions,
  type MatchMode,
} from './utils/global-search.helpers';
