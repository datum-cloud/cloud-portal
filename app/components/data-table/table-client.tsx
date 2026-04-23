import { DataTable, useNuqsAdapter } from '@datum-cloud/datum-ui/data-table';
import type { ContentProps } from '@datum-cloud/datum-ui/data-table';
import type { ActionItem } from '@datum-cloud/datum-ui/data-table';
import { cn } from '@shadcn/lib/utils';
import type { ColumnDef, RowData } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { createActionsColumn } from './columns';
import { DataTablePanel } from './data-table-panel';
import { TableContent } from './table-content';
import { resolveEmptyContent } from './table-utils';
import type { EmptyContentConfig } from './table-utils';
import { DataTableToolbar } from './toolbar/data-table-toolbar';
import type { MultiAction } from './toolbar/data-table-toolbar-actions';

// Suppress unused RowData import — needed to satisfy the generic constraint
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _RowData = RowData;

interface InlineContentConfig<TData> {
  open: boolean;
  position: 'top' | 'row';
  rowId?: string;
  onClose: () => void;
  className?: string;
  render: (params: { onClose: () => void; rowData: TData | null }) => ReactNode;
}

export interface TableClientProps<TData> {
  /** Column definitions for the table. */
  columns: ColumnDef<TData>[];
  /** Data to display in the table. */
  data: TData[];
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
  /**
   * Row-level action items added as a trailing actions column.
   * Uses the same `ActionItem<TData>` type as `createActionsColumn`.
   */
  rowActions?: ActionItem<TData>[];
  /** Called when a row is clicked. Do not combine with inlineContent. */
  onRowClick?: (row: TData) => void;
  /** Inline expandable content rendered inside the table. */
  inlineContent?: InlineContentConfig<TData>;
  /** Empty-state content. String for simple message, config for rich UI. */
  emptyContent?: string | EmptyContentConfig;
  /** Show pagination row. Defaults to true. */
  pagination?: boolean;
  /** Pass-through for any other DataTable.Content props. */
  contentProps?: Omit<ContentProps<TData>, 'emptyMessage'>;
  /** Sync table state (page, sort, search) to the URL via nuqs. Defaults to true. */
  syncUrl?: boolean;
  /** Additional className applied to the DataTable.Client root. */
  className?: string;
  /** Extra children rendered inside DataTable.Client (e.g. context consumers). */
  children?: ReactNode;
}

export function TableClient<TData>({
  columns,
  data,
  title,
  description,
  search,
  filters,
  actions,
  multiActions,
  rowActions,
  onRowClick,
  inlineContent,
  emptyContent,
  pagination = true,
  contentProps,
  syncUrl = true,
  className,
  children,
}: TableClientProps<TData>) {
  const stateAdapter = useNuqsAdapter();

  const hasToolbar = !!(
    title ||
    description ||
    search ||
    filters?.length ||
    actions?.length ||
    multiActions?.length
  );

  const resolvedColumns = rowActions?.length
    ? [...columns, createActionsColumn<TData>(rowActions)]
    : columns;

  return (
    <DataTable.Client
      stateAdapter={syncUrl ? stateAdapter : undefined}
      columns={resolvedColumns}
      data={data}
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
      {inlineContent && (
        <DataTable.InlineContent<TData>
          open={inlineContent.open}
          position={inlineContent.position}
          rowId={inlineContent.rowId}
          onClose={inlineContent.onClose}
          className={inlineContent.className}>
          {inlineContent.render}
        </DataTable.InlineContent>
      )}
      <DataTablePanel>
        <TableContent<TData>
          emptyMessage={resolveEmptyContent(emptyContent)}
          onRowClick={onRowClick}
          {...(contentProps as ContentProps<TData>)}
        />
        {pagination && <DataTable.Pagination />}
      </DataTablePanel>
    </DataTable.Client>
  );
}
