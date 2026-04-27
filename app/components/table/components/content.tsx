import type { ErrorRenderer } from './empty-state';
import { DataTable, useDataTableLoading, useDataTableRows } from '@datum-cloud/datum-ui/data-table';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import type { Cell } from '@tanstack/react-table';
import { useCallback } from 'react';

interface TableContentProps<TData> {
  onRowClick?: (row: TData) => void;
  /** Only relevant in server mode. Resolved by resolveError(). */
  errorContent?: ErrorRenderer;
  /** Refetch callback for the error state. Server mode only. */
  onRefetch?: () => void;
  /**
   * When true, the last column (the auto-appended actions column from
   * `createActionsColumn` or a column with id '_actions') is pinned right.
   * Applied via datum-ui's per-cell cellClassName + headerCellClassName,
   * matching the exact class string the old fork used.
   */
  stickyActionsColumn?: boolean;
}

// Matches old fork: var(--border) NOT var(--color-border); z-20 for both layers.
const STICKY_BODY_CELL = 'sticky right-0 bg-table-cell z-20 shadow-[inset_1px_0_0_0_var(--border)]';
const STICKY_HEADER_CELL =
  '[&:last-child]:sticky [&:last-child]:right-0 [&:last-child]:bg-background [&:last-child]:z-20';

/**
 * Wraps DataTable.Content with:
 * 1. Row-click delegation via a click handler on a wrapping div — datum-ui's
 *    DataTable.Content does not expose onRowClick, so we walk up from the
 *    event target to find the `<tr>` index and look up the row in the store.
 * 2. cursor-pointer class on each row when onRowClick is set.
 * 3. Server-mode error surface when the store has an error.
 *
 * Sticky-right actions column is handled entirely by `app/styles/custom.css`
 * (`.datum-ui-data-table [data-slot='dt-cell']:has([data-slot='dt-row-actions'])`
 * and the empty `:last-child` header cell). That mirrors the old DataTable
 * fork and doesn't require any per-cell className plumbing here.
 *
 * The empty-message inside the table body is a fixed "try adjusting…" hint
 * that only renders when a filter/search is active and produced no matches.
 * The true "no data at all" empty state is handled one level up by
 * TableBodyOrEmpty, which replaces the table entirely with a full
 * EmptyContent card.
 */
export function TableContent<TData>({
  onRowClick,
  errorContent,
  onRefetch,
  stickyActionsColumn,
}: TableContentProps<TData>) {
  const { rows } = useDataTableRows<TData>();
  const { error } = useDataTableLoading();

  const cellClassName = stickyActionsColumn
    ? (cell: Cell<unknown, unknown>) => (cell.column.id === '_actions' ? STICKY_BODY_CELL : '')
    : undefined;
  const headerCellClassName = stickyActionsColumn ? STICKY_HEADER_CELL : undefined;

  const emptyMessage = (
    <EmptyContent
      title="Try adjusting your search or filters"
      className="w-full rounded-none border-0"
    />
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onRowClick) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-slot="checkbox"]')) return;
      if (target.closest('[data-slot="actions"]')) return;
      if (target.closest('[data-slot="dt-row-actions"]')) return;
      const tr = target.closest('tbody tr');
      if (!tr) return;
      const tbody = tr.closest('tbody');
      if (!tbody) return;
      const index = Array.from(tbody.children).indexOf(tr as HTMLTableRowElement);
      const row = rows[index];
      if (row) onRowClick(row.original);
    },
    [onRowClick, rows]
  );

  if (error && errorContent) {
    return <>{errorContent(error, onRefetch ?? (() => {}))}</>;
  }

  const content = (
    <DataTable.Content
      emptyMessage={emptyMessage}
      cellClassName={cellClassName}
      headerCellClassName={headerCellClassName}
    />
  );

  if (!onRowClick) return content;

  return (
    <div onClick={handleClick} className="[&_tbody_tr]:cursor-pointer">
      {content}
    </div>
  );
}
