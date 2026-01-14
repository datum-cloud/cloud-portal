import type { InlineContentRenderParams } from '../features/inline-content/data-table-inline-content';
import { EmptyContentProps } from '@/components/empty-content/empty-content';
import { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table';

// Re-export InlineContentRenderParams from data-table-inline-content for convenience
export type { InlineContentRenderParams } from '../features/inline-content/data-table-inline-content';

export type SearchParams = {
  [key: string]: string | string[] | undefined;
};

// Interface Section
export interface DataTableProps<TData, TValue> {
  // Core data props
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Filter and sorting props
  defaultColumnFilters?: ColumnFiltersState;
  defaultSorting?: SortingState;
  pageSize?: number; // Custom page size (default: 20)
  enableShowAll?: boolean; // Enable "All" option in page size selector (default: false)

  // Filter system (compound components)
  /**
   * @deprecated Use `filters` prop instead. This will be removed in a future version.
   * Legacy filter component wrapped in DataTableFilter context
   */
  filterComponent?: React.ReactNode;

  /**
   * New unified filter system - filters are auto-wrapped in DataTableFilter context
   * No manual wrapping needed
   */
  filters?: React.ReactNode;

  defaultFilters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  onFilteringStart?: () => void; // Callback when filtering starts (for loading states)
  onFilteringEnd?: () => void; // Callback when filtering completes

  // New toolbar configuration
  toolbar?: DataTableToolbarConfig;

  // Filter strategy
  serverSideFiltering?: boolean; // true = API/server filtering, false = client/table filtering (default: false)

  // Display mode props
  mode?: 'table' | 'card';
  hideHeader?: boolean;
  hidePagination?: boolean; // Hide pagination and show all data

  // Styling props
  className?: string;
  tableContainerClassName?: string;
  tableClassName?: string;
  tableCardClassName?: string | ((row: TData) => string | undefined);

  // Actions and behavior props
  rowActions?: DataTableRowActionsProps<TData>[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions?: number; // Maximum number of inline actions to show (default: 3)
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  tableTitle?: DataTableTitleProps;

  // Loading state props
  isLoading?: boolean;
  loadingText?: string;

  // Empty state props
  emptyContent?: EmptyContentProps;

  // ========================================
  // Inline Content Configuration
  // ========================================

  /**
   * Enable inline content functionality
   * Displays custom content inline with table rows
   * @default false
   */
  enableInlineContent?: boolean;

  /**
   * Render function for inline content
   * Content component handles ALL logic (validation, submission, etc.)
   * DataTable only manages show/hide state and animations
   *
   * Position is automatically determined:
   * - Create mode: Always renders at top (first row)
   * - Edit mode: Always replaces the editing row
   *
   * @example Form usage
   * inlineContent={({ mode, data, onClose }) => (
   *   <RecordForm mode={mode} data={data} onClose={onClose} />
   * )}
   *
   * @example Preview/Details usage
   * inlineContent={({ mode, data, onClose }) => (
   *   <RecordDetails data={data} onClose={onClose} />
   * )}
   */
  inlineContent?: (params: InlineContentRenderParams<TData>) => React.ReactNode;

  /**
   * Custom className for inline content container row
   */
  inlineContentClassName?: string;

  /**
   * Callback when inline content opens (optional, for side effects)
   */
  onInlineContentOpen?: (mode: 'create' | 'edit', data?: TData) => void;

  /**
   * Callback when inline content closes (optional, for side effects)
   */
  onInlineContentClose?: () => void;
}

export interface DataTableRowActionsProps<TData> {
  key: string;
  label: string;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  className?: string;
  action: (row: TData) => void | Promise<void>;
  disabled?: (row: TData) => boolean;
  hidden?: (row: TData) => boolean;
  display?: 'dropdown' | 'inline'; // Control whether action appears as inline button or in dropdown (default: 'dropdown')
  showLabel?: boolean; // For inline buttons, whether to show label alongside icon (default: false for inline, true for dropdown)
  tooltip?: string | React.ReactNode | ((row: TData) => string | React.ReactNode | undefined); // Tooltip text - can be static string or function that receives row data
  /**
   * Mark this action as inline-edit trigger
   * When clicked, opens inline content in edit mode
   * The action() callback will still be called before opening (for optional pre-logic)
   */
  triggerInlineEdit?: boolean;
}

export interface DataTableTitleProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

// =============================================================================
// New Toolbar Configuration Types
// =============================================================================

/**
 * Search configuration for the toolbar
 */
export interface DataTableSearchConfig {
  /** Placeholder text for search input */
  placeholder?: string;
  /** Filter key for search (default: 'q') - only used for single column search */
  filterKey?: string;
  /** Search mode: 'global-search' for multi-column (default), 'search' for single column */
  mode?: 'search' | 'global-search';
  /** Columns to search in (for global-search mode) */
  searchableColumns?: string[];
  /** Debounce delay in milliseconds (default: 300) */
  debounce?: number;
}

/**
 * Toolbar layout configuration
 */
export interface DataTableToolbarConfig {
  /** Layout mode for the toolbar */
  layout?: 'stacked' | 'compact';

  /**
   * @deprecated Use `includeSearch` instead. This will be removed in a future version.
   */
  search?: boolean | DataTableSearchConfig;

  /**
   * Include built-in search filter in the toolbar
   * Search is just another filter, auto-wrapped like other filters
   */
  includeSearch?: boolean | DataTableSearchConfig;

  /** How to display filters */
  filtersDisplay?: 'inline' | 'dropdown' | 'auto';

  /** Maximum inline filters before moving to dropdown (for 'auto' mode) */
  maxInlineFilters?: number;

  /** Specific filters to always show inline (overrides auto logic) */
  primaryFilters?: string[];

  /** Show filter count badge on dropdown button */
  showFilterCount?: boolean;

  /** Show row count before filters (e.g., "Showing 5 records") */
  showRowCount?: boolean;

  /** Enable responsive behavior (auto-collapse on mobile) */
  responsive?: boolean;
}

// =============================================================================
// DataTable Ref API (for external control)
// =============================================================================

/**
 * Ref interface for DataTable component
 * Allows external components to control inline content state
 *
 * @example
 * const tableRef = useRef<DataTableRef<User>>(null);
 *
 * // Open create content
 * tableRef.current?.openCreate();
 *
 * // Open edit content for specific row
 * tableRef.current?.openEdit(row.id, row.original);
 *
 * // Close content
 * tableRef.current?.close();
 */
export interface DataTableRef<TData> {
  /**
   * Open inline content in create mode
   */
  openCreate: () => void;

  /**
   * Open inline content in edit mode for a specific row
   * @param rowId - ID of the row to edit
   * @param rowData - Data of the row to edit
   */
  openEdit: (rowId: string, rowData: TData) => void;

  /**
   * Close the inline content
   */
  close: () => void;

  /**
   * Get current inline content state
   */
  getState: () => {
    isOpen: boolean;
    mode: 'create' | 'edit' | null;
    editingRowId: string | null;
  };
}
