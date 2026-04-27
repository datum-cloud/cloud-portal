import { TableContent } from './components/content';
import { TableBodyOrEmpty } from './components/empty-state';
import { PagePreserver } from './components/page-preserver';
import { ConditionalPagination } from './components/pagination';
import { TablePanel } from './components/panel';
import { TableToolbar } from './components/toolbar';
import { useInlineConflictWarning, useResolvedColumns, useTableUrlAdapter } from './hooks';
import type { TableClientProps } from './types';
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
 * - Optional inline content panel.
 * - Bordered table panel, then pagination OUTSIDE the border. Pagination
 *   auto-hides when there is only one page.
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
export function TableClient<TData>(props: TableClientProps<TData>) {
  const stateAdapter = useTableUrlAdapter(props.urlSync ?? true);
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

  return (
    <DataTable.Client
      stateAdapter={stateAdapter}
      columns={columns}
      data={props.data}
      getRowId={props.getRowId}
      enableRowSelection={!!props.multiActions?.length}
      loading={props.loading}
      pageSize={props.pageSize}
      className={cn('space-y-4', props.className)}>
      <PagePreserver<TData> data={props.data} />

      {hasToolbar && <TableToolbar<TData> {...toolbarPropsFrom(props)} />}

      {props.inline && (
        <DataTable.InlineContent
          open={props.inline.open}
          position={props.inline.position}
          rowId={props.inline.rowId}
          onClose={props.inline.onClose}
          className={props.inline.className}>
          {(params) => (
            <div className="bg-table-cell animate-in fade-in-0 slide-in-from-top-2 relative rounded-md p-3.5 duration-200 ease-out">
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
