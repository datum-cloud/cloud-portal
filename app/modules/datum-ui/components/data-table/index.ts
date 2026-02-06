// =============================================================================
// DataTable Main Exports
// =============================================================================
// This is the main entry point for the DataTable component system.
// It exports all components, types, hooks, and utilities needed to use the DataTable.

// =============================================================================
// Core Components
// =============================================================================

// Main DataTable component and provider
export { DataTable } from './core/data-table';
export { DataTableProvider } from './core/data-table.context';

// Table view components
export { DataTableView } from './core/data-table-view';
export { DataTableCardView } from './core/data-table-card-view';
export { DataTableLoadingContent } from './core/data-table-loading';

// Table sub-component types
export type { DataTableViewProps } from './core/data-table-view';
export type { DataTableCardViewProps } from './core/data-table-card-view';

// =============================================================================
// Feature Components
// =============================================================================

// Column components
export { DataTableColumnHeader } from './features/columns/data-table-column-header';
export type { DataTableColumnHeaderProps } from './features/columns/data-table-column-header';

// Toolbar components
export { DataTableToolbar } from './features/toolbar/data-table-toolbar';
export { DataTableToolbarSearch } from './features/toolbar/data-table-toolbar-search';
export { DataTableToolbarFilterDropdown } from './features/toolbar/data-table-toolbar-filter-dropdown';
export { DataTableToolbarMultiActions } from './features/toolbar/data-table-toolbar-multi-actions';
export { DataTableToolbarRowCount } from './features/toolbar/data-table-toolbar-row-count';
export type { DataTableToolbarProps } from './features/toolbar/data-table-toolbar';
export type { DataTableToolbarSearchProps } from './features/toolbar/data-table-toolbar-search';
export type { DataTableToolbarFilterDropdownProps } from './features/toolbar/data-table-toolbar-filter-dropdown';
export type { DataTableToolbarMultiActionsProps } from './features/toolbar/data-table-toolbar-multi-actions';

// Pagination components
export { DataTablePagination } from './features/pagination/data-table-pagination';

// Action components
export { DataTableRowActions } from './features/actions/data-table-row-actions';

// Inline content components
export { DataTableInlineContent } from './features/inline-content/data-table-inline-content';
export type {
  DataTableInlineContentProps,
  InlineContentRenderParams,
} from './features/inline-content/data-table-inline-content';

// =============================================================================
// Core Types
// =============================================================================

// Main component types
export type {
  DataTableProps,
  DataTableRowActionsProps,
  DataTableTitleProps,
  DataTableToolbarConfig,
  DataTableSearchConfig,
  DataTableRef,
  SearchParams,
  // Multi-select types
  MultiAction,
  MultiActionButtonProps,
  MultiActionRenderProps,
} from './core/data-table.types';

// Column types (includes module augmentation for TanStack Table)
export type { ColumnHeaderTooltip } from './features/columns/data-table-column.types';
export { isTooltipConfig, normalizeTooltip } from './features/columns/data-table-column.types';

// Context types
export type {
  FilterValue,
  FilterState,
  FilterParser,
  FilterParserRegistry,
  DataTableProviderProps,
} from './core/data-table.context';

// =============================================================================
// Core Context & Hooks
// =============================================================================

// Context
export { DataTableContext } from './core/data-table.context';

// Core hooks
export {
  useDataTable,
  useDataTableFilter,
  useFilter,
  useTableData,
  useFilterData,
  useTableState,
} from './core/data-table.context';

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
} from './features/filter/data-table-filter';

// Filter component types
export type { DataTableFilterProps } from './features/filter/data-table-filter';
export type { SearchFilterProps } from './features/filter/components/search';
export type { GlobalSearchFilterProps } from './features/filter/components/global-search';
export type { DatePickerFilterProps } from './features/filter/components/datepicker';
export type { SelectFilterProps, SelectOption } from './features/filter/components/select';
export type { RadioFilterProps, RadioOption } from './features/filter/components/radio';
export type { CheckboxFilterProps, CheckboxOption } from './features/filter/components/checkbox';

// =============================================================================
// Re-exports for Convenience
// =============================================================================

// Re-export everything from filter for backward compatibility
// This ensures existing imports from '@/modules/datum-ui/components/data-table/filter' continue to work
export * from './features/filter';

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
