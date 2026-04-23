import { DataTable, useNuqsAdapter } from '@datum-cloud/datum-ui/data-table';
import type { UseDataTableClientOptions } from '@datum-cloud/datum-ui/data-table';
import { DataTablePanel } from './data-table-panel';
import { TableContent } from './table-content';
import type { DataTableToolbarProps } from './toolbar/data-table-toolbar';
import { DataTableToolbar } from './toolbar/data-table-toolbar';
import { cn } from '@shadcn/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

export interface TableClientProps<TData> {
  /** Column definitions for the table. */
  columns: ColumnDef<TData>[];
  /** Data to display in the table. */
  data: TData[];
  /** Toolbar configuration. Omit to render no toolbar. */
  toolbar?: DataTableToolbarProps<TData>;
  /** Message shown when the table has no rows. */
  emptyMessage?: string;
  /** Called when a row is clicked. Do not combine with inlineContent. */
  onRowClick?: (row: TData) => void;
  /** Additional content rendered inside the panel, after the table. */
  footer?: ReactNode;
  /** Additional className applied to the DataTable.Client root. */
  className?: string;
  /**
   * Override the state adapter. Defaults to a nuqs adapter so table state
   * is synced to the URL automatically.
   */
  stateAdapter?: UseDataTableClientOptions<TData>['stateAdapter'];
  /** Pass-through for any other DataTable.Client props. */
  tableProps?: Omit<UseDataTableClientOptions<TData>, 'columns' | 'data' | 'stateAdapter'>;
}

export function TableClient<TData>({
  columns,
  data,
  toolbar,
  emptyMessage = 'No results found.',
  onRowClick,
  footer,
  className,
  stateAdapter: stateAdapterProp,
  tableProps,
}: TableClientProps<TData>) {
  const nuqsAdapter = useNuqsAdapter();
  const stateAdapter = stateAdapterProp ?? nuqsAdapter;

  return (
    <DataTable.Client
      columns={columns}
      data={data}
      stateAdapter={stateAdapter}
      className={cn('space-y-4', className)}
      {...tableProps}>
      {toolbar && <DataTableToolbar {...toolbar} />}
      <DataTablePanel>
        <TableContent emptyMessage={emptyMessage} onRowClick={onRowClick} />
        <DataTable.Pagination />
        {footer}
      </DataTablePanel>
    </DataTable.Client>
  );
}
