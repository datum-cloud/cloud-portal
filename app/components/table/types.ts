import type { ActionItem, UseDataTableServerOptions } from '@datum-cloud/datum-ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

/**
 * Row action descriptor. Extends datum-ui's `ActionItem<TData>` with the
 * presentation and wiring fields needed by the fork's inline + dropdown
 * row-actions pattern.
 *
 * - `display`: `'inline'` renders a compact button in the cell; `'dropdown'`
 *   (or omitted) routes the action into the kebab `MoreActions` menu.
 * - `showLabel`: only meaningful for `display: 'inline'` — pairs the icon
 *   with the text label (defaults to icon-only).
 * - `triggerInlineEdit`: a marker preserved for consumers that want to
 *   open their controlled `inline` panel from within the action's
 *   `onClick` handler. The wrapper does NOT auto-open — `inline` is owned
 *   by the consumer.
 * - `data-e2e`: applied to the rendered button for e2e-test targeting.
 * - `tooltip`: widened to accept a ReactNode and/or a function of the row.
 */
export type RowAction<TData> = Omit<ActionItem<TData>, 'tooltip'> & {
  display?: 'inline' | 'dropdown';
  showLabel?: boolean;
  triggerInlineEdit?: boolean;
  'data-e2e'?: string;
  tooltip?: ReactNode | ((row: TData) => ReactNode | undefined);
};

/** Empty-state configuration. String form is used as title only. */
export type EmptyContentConfig = {
  title?: string;
  description?: string;
  actions?: Array<{
    label: string;
    type: 'button' | 'link' | 'external-link';
    onClick?: () => void;
    href?: string;
    icon?: ReactNode;
    /** Visual variant. `'outline'` renders a bordered secondary button. */
    variant?: 'default' | 'destructive' | 'outline';
  }>;
};

/** Controlled inline-content config. Mutually exclusive with onRowClick. */
export type InlineContentConfig<TData> = {
  open: boolean;
  position: 'top' | 'row';
  rowId?: string;
  onClose: () => void;
  className?: string;
  render: (args: { onClose: () => void; rowData: TData | null }) => ReactNode;
};

/** Arguments passed to Table.Server fetchFn. Derived from datum-ui. */
export type ServerFetchArgs = Parameters<UseDataTableServerOptions<unknown, unknown>['fetchFn']>[0];

/** Return shape from Table.Server transform. Derived from datum-ui. */
export type ServerTransformResult<TData> = ReturnType<
  UseDataTableServerOptions<unknown, TData>['transform']
>;

/** Imperative handle exposed by Table.Server. */
export type TableServerRef = {
  refetch: () => void;
};

/**
 * Bulk action descriptor. Extends datum-ui's MultiAction with a helpers arg
 * (clearSelection) injected by the wrapper.
 */
export type MultiAction<TData> = {
  label: string;
  onClick: (rows: TData[], helpers: { clearSelection: () => void }) => void | Promise<void>;
  icon?: ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
};

/** Props shared by Table.Client and Table.Server. */
export type TableSharedProps<TData> = {
  columns: ColumnDef<TData>[];
  empty?: string | EmptyContentConfig;

  // Toolbar
  title?: string;
  description?: ReactNode;
  search?: string | true;
  filters?: ReactNode[];
  actions?: ReactNode | ReactNode[];
  /**
   * Extra content rendered in the PageTitle row, aligned to the right of
   * the title/description. Intended for promotional cards or onboarding
   * hints (e.g. the ConnectorDownloadCard). Mirrors the legacy
   * `rightSide` slot on the old DataTable.
   */
  headerExtra?: ReactNode;

  // Row behavior
  onRowClick?: (row: TData) => void;
  rowActions?: RowAction<TData>[];
  multiActions?: MultiAction<TData>[];

  // Row-action gates — forwarded into the actions cell renderer.
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  /** Safety cap for inline actions; excess falls back to dropdown. Defaults to 3. */
  maxInlineActions?: number;

  // Behavior toggles
  /**
   * Pagination mode:
   * - `true` / omitted → full pagination bar (row count, page-size selector, page numbers, prev/next).
   * - `false` → no pagination at all.
   * - `'simple'` → minimal prev/next buttons only. Intended for cursor-based
   *   server tables (e.g. activity logs) where total row count and page
   *   numbers aren't meaningful.
   */
  pagination?: boolean | 'simple';
  urlSync?: boolean;
  /** Rows per page. Defaults to datum-ui's value (20). */
  pageSize?: number;

  // Passthroughs
  getRowId?: (row: TData) => string;
  className?: string;
};

/** Props for Table.Client. */
export type TableClientProps<TData> = TableSharedProps<TData> & {
  data: TData[];
  inline?: InlineContentConfig<TData>;
  /**
   * When true, the table renders a skeleton layout for toolbar, column
   * headers and body rows instead of the normal content. Skeleton is shown
   * only during the first loading phase — once the value transitions to
   * false, subsequent flips back to true are ignored (see
   * `useInitialLoading`). Typical usage: `loading={query.isPending}`.
   *
   * Server mode derives this automatically from the internal fetch state
   * and does not expose a matching prop.
   */
  loading?: boolean;
};

/** Props for Table.Server. */
export type TableServerProps<TData, TResponse = unknown> = TableSharedProps<TData> & {
  fetchFn: (args: ServerFetchArgs) => Promise<TResponse>;
  transform: (response: TResponse) => ServerTransformResult<TData>;
  limit?: number;
  defaultFilters?: Record<string, unknown>;
  refetchKey?: number;
  onError?: (error: Error) => void;
  errorContent?: ReactNode | ((error: Error, refetch: () => void) => ReactNode);
};
