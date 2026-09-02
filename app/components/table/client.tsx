import { TableContent } from './components/content';
import { TableBodyOrEmpty } from './components/empty-state';
import { LiveUpdatesChip } from './components/live-updates-chip';
import { LiveUpdatesToggle } from './components/live-updates-toggle';
import { ConditionalPagination } from './components/pagination';
import { TablePanel } from './components/panel';
import { TableToolbar } from './components/toolbar';
import { useInlineConflictWarning, useResolvedColumns, useTableUrlAdapter } from './hooks';
import type { RowData, TableClientProps } from './types';
import { detectToolbar, toolbarPropsFrom } from './utils';
import { Button } from '@datum-cloud/datum-ui/button';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { CloseIcon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';

/**
 * Client-side data table entry point. Wraps datum-ui's DataTable.Client with
 * the cloud-portal toolbar, panel shell, empty-state resolver, and row-click
 * delegation. Compose via `Table.Client` (see `./table.tsx`).
 *
 * Layout:
 * - Toolbar on top (title/description always; search/filters/actions row
 *   hides when the table is standalone-empty).
 * - Optional inline content panel — rendered inside the table via
 *   `<DataTable.InlineContent>` so the form sits under the column headers
 *   (or replaces a row when `position='row'`). On narrow viewports the
 *   panel uses sticky-left positioning + container-query sizing (see
 *   `app/styles/custom.css` for `[data-slot='dt-inline-content']`) so its
 *   visible width matches the scroll container instead of the overflowing
 *   table width. Inner forms should declare `@container` and use Tailwind
 *   container-query variants (`@xs:`, `@md:` …) to reflow at narrow widths.
 * - Bordered table panel, then pagination OUTSIDE the border. Pagination
 *   auto-hides when there is only one page.
 * - `liveUpdates` adds a toolbar control — the pause/resume toggle plus a
 *   catch-up chip — immediately after the search input. Both pieces are
 *   composed into one `searchTrailing` node below, so they render (or
 *   don't) from the exact same slot: the standalone-empty state and the
 *   initial-loading skeleton suppress the whole tools row, taking both with
 *   them, rather than one being able to survive without the other. Below
 *   `sm:`, search (which always claims the full row width) and this
 *   trailing pair no longer fit on one line together, so the left group's
 *   flex container wraps them onto a second line — see `TableToolbarTools`
 *   in `./components/toolbar.tsx`.
 * - When data is empty AND no filter/search active, the table chrome is
 *   suppressed and only the EmptyContent card renders.
 *
 * Key behaviors:
 * - `inline` and `onRowClick` are mutually exclusive; `inline` wins.
 * - `enableRowSelection` is derived from `!!multiActions?.length`.
 * - Sticky-right actions column is styled by `app/styles/custom.css`
 *   targeting `[data-slot='dt-cell']:has([data-slot='dt-row-actions'])` —
 *   no per-cell className plumbing here.
 * - `urlSync` defaults to true; pass `false` to disable URL state sync.
 */
export function TableClient<TData extends RowData>(props: TableClientProps<TData>) {
  const stateAdapter = useTableUrlAdapter(props.urlSync ?? true, props.filterParsers);
  const columns = useResolvedColumns(props.columns, props.rowActions, {
    hideRowActions: props.hideRowActions,
    disableRowActions: props.disableRowActions,
    maxInlineActions: props.maxInlineActions,
  });
  const hasToolbar = detectToolbar(props);
  const hasActionsColumn =
    !!props.rowActions?.length || props.columns.some((c) => c.id === '_actions');

  useInlineConflictWarning(props);

  const effectiveOnRowClick = props.inline ? undefined : props.onRowClick;
  const toolbarProps = toolbarPropsFrom(props);
  // Composed as one node — not two independent render sites — so the chip
  // can never appear without the toggle beside it, or vice versa. See the
  // layout note above.
  const searchTrailing = props.liveUpdates && (
    <>
      <LiveUpdatesToggle queryKey={props.liveUpdates.queryKey} />
      <LiveUpdatesChip queryKey={props.liveUpdates.queryKey} />
    </>
  );

  return (
    <DataTable.Client
      stateAdapter={stateAdapter}
      columns={columns}
      data={props.data}
      getRowId={props.getRowId}
      enableRowSelection={!!props.multiActions?.length}
      loading={props.loading}
      pageSize={props.pageSize}
      searchableColumns={props.searchableColumns}
      className={cn('space-y-6', props.className)}>
      {hasToolbar && <TableToolbar<TData> {...toolbarProps} searchTrailing={searchTrailing} />}

      {props.inline && (
        <DataTable.InlineContent
          open={props.inline.open}
          position={props.inline.position}
          rowId={props.inline.rowId}
          onClose={props.inline.onClose}
          className={props.inline.className}>
          {(params) => (
            <div className="bg-table-cell animate-in fade-in-0 slide-in-from-top-2 @container relative rounded-md p-3.5 duration-200 ease-out">
              <Button
                type="quaternary"
                theme="link"
                size="icon"
                className="absolute top-2 right-2 size-[23px]"
                onClick={params.onClose}
                aria-label="Close">
                <CloseIcon />
              </Button>
              {props.inline!.render(
                params as unknown as { onClose: () => void; rowData: TData | null }
              )}
            </div>
          )}
        </DataTable.InlineContent>
      )}

      <TableBodyOrEmpty<TData> empty={props.empty}>
        <TablePanel>
          <TableContent<TData>
            onRowClick={effectiveOnRowClick}
            stickyActionsColumn={hasActionsColumn}
          />
        </TablePanel>
        {props.pagination !== false && <ConditionalPagination variant={props.pagination} />}
      </TableBodyOrEmpty>
    </DataTable.Client>
  );
}
