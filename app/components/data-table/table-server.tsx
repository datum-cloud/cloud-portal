import { DataTable, useNuqsAdapter } from '@datum-cloud/datum-ui/data-table';
import type { UseDataTableServerOptions } from '@datum-cloud/datum-ui/data-table';
import { DataTablePanel } from './data-table-panel';
import { TableContent } from './table-content';
import type { DataTableToolbarProps } from './toolbar/data-table-toolbar';
import { DataTableToolbar } from './toolbar/data-table-toolbar';
import { cn } from '@shadcn/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface TableServerProps<TData, TResponse = unknown> {
  /** Column definitions for the table. */
  columns: ColumnDef<TData>[];
  /** Async function that fetches a page of data from the server. */
  fetchFn: UseDataTableServerOptions<TResponse, TData>['fetchFn'];
  /** Transforms the raw fetch response into the shape DataTable.Server expects. */
  transform: UseDataTableServerOptions<TResponse, TData>['transform'];
  /** Page size limit passed to the server. */
  limit?: number;
  /** Toolbar configuration. Omit to render no toolbar. */
  toolbar?: DataTableToolbarProps<TData>;
  /** Message shown when the table has no rows. */
  emptyMessage?: string;
  /** Called when a row is clicked. Do not combine with inlineContent. */
  onRowClick?: (row: TData) => void;
  /** Whether to hide the pagination row. Defaults to false. */
  hidePagination?: boolean;
  /** Additional content rendered inside the panel, after the table. */
  footer?: ReactNode;
  /**
   * Extra children rendered inside DataTable.Server but outside the panel
   * (e.g. error handlers, refresh buttons that need server context).
   */
  contextChildren?: ReactNode;
  /** Additional className applied to the DataTable.Server root. */
  className?: string;
  /**
   * Override the state adapter. Defaults to a nuqs adapter so table state
   * is synced to the URL automatically.
   */
  stateAdapter?: UseDataTableServerOptions<TResponse, TData>['stateAdapter'];
  /** Pass-through for any other DataTable.Server props. */
  tableProps?: Omit<
    UseDataTableServerOptions<TResponse, TData>,
    'columns' | 'fetchFn' | 'transform' | 'limit' | 'stateAdapter'
  >;
}

export function TableServer<TData, TResponse = unknown>({
  columns,
  fetchFn,
  transform,
  limit,
  toolbar,
  emptyMessage = 'No results found.',
  onRowClick,
  hidePagination = false,
  footer,
  contextChildren,
  className,
  stateAdapter: stateAdapterProp,
  tableProps,
}: TableServerProps<TData, TResponse>) {
  const nuqsAdapter = useNuqsAdapter();
  const stateAdapter = stateAdapterProp ?? nuqsAdapter;

  return (
    <DataTable.Server
      columns={columns}
      fetchFn={fetchFn}
      transform={transform}
      limit={limit}
      stateAdapter={stateAdapter}
      className={cn('space-y-4', className)}
      {...tableProps}>
      {contextChildren}
      {toolbar && <DataTableToolbar {...toolbar} />}
      <DataTablePanel>
        <TableContent emptyMessage={emptyMessage} onRowClick={onRowClick} />
        {!hidePagination && <DataTable.Pagination />}
        {footer}
      </DataTablePanel>
    </DataTable.Server>
  );
}
