import type { RowData } from '../types';
import type { ErrorRenderer } from './empty-state';
import { RowSyncKeyProvider, isTableRowLocked } from './row-sync-context';
import { useTableRowSync } from './use-table-row-sync';
import { syncState } from '@/modules/watch/sync-state';
import {
  DataTable,
  useDataTableLoading,
  useDataTableRows,
  type ContentProps,
} from '@datum-cloud/datum-ui/data-table';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useCallback, useMemo, useRef } from 'react';

interface TableContentProps<TData extends RowData> {
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
  /** Sync-state key of a row; rows get a `sync-<state>` class (see custom.css). */
  getRowSyncKey?: (row: TData) => string | undefined;
}

// Matches old fork: var(--border) NOT var(--color-border); z-20 for both layers.
const STICKY_BODY_CELL = 'sticky right-0 bg-table-cell z-20 shadow-[inset_1px_0_0_0_var(--border)]';
const STICKY_HEADER_CELL =
  '[&:last-child]:sticky [&:last-child]:right-0 [&:last-child]:bg-background [&:last-child]:z-20';

// Typed from datum-ui's prop: DataTableContent is not generic, so cells carry the erased row type.
const stickyBodyCellClassName: NonNullable<ContentProps['cellClassName']> = (cell) =>
  cell.column.id === '_actions' ? STICKY_BODY_CELL : '';

const EMPTY_MESSAGE = (
  <EmptyContent
    title="try adjusting your search or filters"
    className="w-full rounded-none border-0"
  />
);

/**
 * Wraps DataTable.Content with:
 * 1. Row-click delegation via a click handler on a wrapping div — datum-ui's
 *    DataTable.Content does not expose onRowClick, so we walk up from the
 *    event target to find the `<tr>` index and look up the row in the store.
 * 2. cursor-pointer class on each row when onRowClick is set.
 * 3. Server-mode error surface when the store has an error.
 * 4. A `sync-<state>` class per row when `getRowSyncKey` is given (styled in
 *    custom.css). Locked rows also get `sync-locked` and cannot be opened.
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
export function TableContent<TData extends RowData>({
  onRowClick,
  errorContent,
  onRefetch,
  stickyActionsColumn,
  getRowSyncKey,
}: TableContentProps<TData>) {
  const { rows } = useDataTableRows<TData>();
  const { error } = useDataTableLoading();
  // Callers usually pass an inline arrow; a ref keeps a new function each
  // render from rebuilding the row classes and the row-actions context.
  const getRowSyncKeyRef = useRef(getRowSyncKey);
  getRowSyncKeyRef.current = getRowSyncKey;
  const tracksSync = getRowSyncKey !== undefined;

  const rowKeys = getRowSyncKey
    ? rows.map((row) => getRowSyncKey(row.original)).filter((key) => key !== undefined)
    : [];
  const { version, isAlternateFlash } = useTableRowSync(rowKeys);

  const getAnyRowSyncKey = useCallback(
    (row: unknown) => getRowSyncKeyRef.current?.(row as TData),
    []
  );

  const cellClassName: ContentProps['cellClassName'] = stickyActionsColumn
    ? stickyBodyCellClassName
    : undefined;
  const headerCellClassName = stickyActionsColumn ? STICKY_HEADER_CELL : undefined;

  const rowClassName = useMemo<ContentProps['rowClassName']>(
    () =>
      tracksSync
        ? (row) => {
            const key = getRowSyncKeyRef.current?.(row.original as TData);
            const state = key ? syncState.get(key) : undefined;
            return cn(
              state && `sync-${state}`,
              state === 'changed' && key && isAlternateFlash(key) && 'sync-changed-again',
              isTableRowLocked(key, state) && 'sync-locked'
            );
          }
        : undefined,
    [tracksSync, version, isAlternateFlash]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onRowClick) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-slot="checkbox"]')) return;
      if (target.closest('[data-slot="actions"]')) return;
      if (target.closest('[data-slot="dt-row-actions"]')) return;
      // Nested resource links should navigate without also opening the row.
      if (target.closest('a')) return;
      const tr = target.closest('tbody tr');
      if (!tr) return;
      const tbody = tr.closest('tbody');
      if (!tbody) return;
      const index = Array.from(tbody.children).indexOf(tr as HTMLTableRowElement);
      const row = rows[index];
      if (!row) return;
      const key = getRowSyncKeyRef.current?.(row.original);
      if (key && isTableRowLocked(key, syncState.get(key))) return;
      onRowClick(row.original);
    },
    [onRowClick, rows]
  );

  const content = useMemo(
    () => (
      <RowSyncKeyProvider value={tracksSync ? getAnyRowSyncKey : undefined}>
        <DataTable.Content
          emptyMessage={EMPTY_MESSAGE}
          cellClassName={cellClassName}
          headerCellClassName={headerCellClassName}
          rowClassName={rowClassName}
        />
      </RowSyncKeyProvider>
    ),
    [tracksSync, getAnyRowSyncKey, cellClassName, headerCellClassName, rowClassName]
  );

  if (error && errorContent) {
    return <>{errorContent(error, onRefetch ?? (() => {}))}</>;
  }

  if (!onRowClick) return content;

  return (
    <div onClick={handleClick} className="[&_tbody_tr:not(.sync-locked)]:cursor-pointer">
      {content}
    </div>
  );
}
