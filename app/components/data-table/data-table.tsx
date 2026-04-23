// Re-exports from @datum-cloud/datum-ui/data-table
// This barrel provides convenient access to DataTable components, hooks, and types

export {
  // Namespace API (recommended entry point)
  DataTable,
  // Direct component exports
  createSelectionColumn,
  useNuqsAdapter,
  useDataTableFilters,
  useDataTableInlineContents,
  useDataTableLoading,
  useDataTablePagination,
  useDataTableRows,
  useDataTableSearch,
  useDataTableSelection,
  useDataTableSorting,
  // Constants
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_LOADING_ROWS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZES,
  // Store creation
  createDataTableStore,
} from '@datum-cloud/datum-ui/data-table';

export type {
  // Type exports
  ActionItem,
  ActiveFiltersProps,
  BulkActionsProps,
  ClientPaginationState,
  ColumnHeaderProps,
  ContentProps,
  CreateStoreOptions,
  DataTableClientProps,
  DataTableContextValue,
  DataTableServerProps,
  DataTableState,
  DataTableStore,
  DataTableStoreState,
  FilterCheckboxProps,
  FilterDatePickerProps,
  FilterOption,
  FilterSelectProps,
  FilterStrategy,
  FilterValue,
  InlineContentEntry,
  InlineContentProps,
  InlineContentRenderParams,
  LoadingProps,
  PaginationProps,
  PaginationState,
  RowActionsProps,
  SearchProps,
  SelectionColumnOptions,
  ServerFetchArgs,
  ServerPaginationState,
  ServerTransformResult,
  StateAdapter,
  UseDataTableClientOptions,
  UseDataTableServerOptions,
  UseNuqsAdapterOptions,
} from '@datum-cloud/datum-ui/data-table';
