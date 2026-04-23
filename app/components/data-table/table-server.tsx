import { DataTable, useNuqsAdapter } from '@datum-cloud/datum-ui/data-table';
import type { ContentProps, UseDataTableServerOptions } from '@datum-cloud/datum-ui/data-table';
import { cn } from '@shadcn/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { DataTablePanel } from './data-table-panel';
import { TableContent } from './table-content';
import { resolveEmptyContent } from './table-utils';
import type { EmptyContentConfig } from './table-utils';
import { DataTableToolbar } from './toolbar/data-table-toolbar';
import type { MultiAction } from './toolbar/data-table-toolbar-actions';

export interface TableServerProps<TData, TResponse = unknown> {
  /** Column definitions for the table. */
  columns: ColumnDef<TData>[];
  /** Async function that fetches a page of data from the server. */
  fetchFn: UseDataTableServerOptions<TResponse, TData>['fetchFn'];
  /** Transforms the raw fetch response into the shape DataTable.Server expects. */
  transform: UseDataTableServerOptions<TResponse, TData>['transform'];
  /** Page size passed to the server. */
  limit?: number;
  /** Default filter values applied on mount. */
  defaultFilters?: UseDataTableServerOptions<TResponse, TData>['defaultFilters'];
  /** Table title rendered in the toolbar. */
  title?: string;
  /** Table description rendered below the title. */
  description?: ReactNode;
  /** Enable global search. Pass `{ placeholder }` to customise the input. */
  search?: boolean | { placeholder?: string };
  /** Filter controls rendered in the toolbar row. */
  filters?: ReactNode[];
  /** Action buttons rendered on the right side of the toolbar. */
  actions?: ReactNode[];
  /** Multi-row action items rendered in the bulk-actions dropdown. */
  multiActions?: MultiAction<TData>[];
  /** Called when a row is clicked. */
  onRowClick?: (row: TData) => void;
  /** Empty-state content. String for simple message, config for rich UI. */
  emptyContent?: string | EmptyContentConfig;
  /** Show pagination row. Defaults to true. */
  pagination?: boolean;
  /** Pass-through for any other DataTable.Content props. */
  contentProps?: Omit<ContentProps<TData>, 'emptyMessage'>;
  /** Sync table state (page, sort, search) to the URL via nuqs. Defaults to true. */
  syncUrl?: boolean;
  /** Additional className applied to the DataTable.Server root. */
  className?: string;
  /** Extra children rendered inside DataTable.Server (e.g. error handlers, refresh buttons). */
  children?: ReactNode;
}

export function TableServer<TData, TResponse = unknown>({
  columns,
  fetchFn,
  transform,
  limit,
  defaultFilters,
  title,
  description,
  search,
  filters,
  actions,
  multiActions,
  onRowClick,
  emptyContent,
  pagination = true,
  contentProps,
  syncUrl = true,
  className,
  children,
}: TableServerProps<TData, TResponse>) {
  const stateAdapter = useNuqsAdapter();

  const hasToolbar = !!(
    title ||
    description ||
    search ||
    filters?.length ||
    actions?.length ||
    multiActions?.length
  );

  return (
    <DataTable.Server
      columns={columns}
      fetchFn={fetchFn}
      transform={transform}
      limit={limit}
      defaultFilters={defaultFilters}
      stateAdapter={syncUrl ? stateAdapter : undefined}
      className={cn('space-y-4', className)}>
      {children}
      {hasToolbar && (
        <DataTableToolbar<TData>
          title={title}
          description={description}
          search={search}
          filters={filters}
          actions={actions}
          multiActions={multiActions}
        />
      )}
      <DataTablePanel>
        <TableContent<TData>
          emptyMessage={resolveEmptyContent(emptyContent)}
          onRowClick={onRowClick}
          {...(contentProps as ContentProps<TData>)}
        />
        {pagination && <DataTable.Pagination />}
      </DataTablePanel>
    </DataTable.Server>
  );
}
