import { DataTableInlineForm, InlineFormRenderParams } from './data-table-inline-form';
import { DataTableRowActions } from './data-table-row-actions';
import { DataTableRowActionsProps } from './data-table.types';
import { useDataTable } from './data-table.context';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { cn } from '@shadcn/lib/utils';
import { TableBody, TableCell, TableRow } from '@shadcn/ui/table';
import { Table as TTable, flexRender } from '@tanstack/react-table';
import { Fragment } from 'react';

export interface DataTableViewProps<TData> {
  table: TTable<TData>;
  columns: any[];
  rowActions?: DataTableRowActionsProps<TData>[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions?: number;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  // Inline form props
  enableInlineForm?: boolean;
  inlineFormContent?: (params: InlineFormRenderParams<TData>) => React.ReactNode;
  inlineFormClassName?: string;
  inlineFormPosition?: 'top' | 'replace';
}

export const DataTableView = <TData,>({
  table,
  columns,
  rowActions = [],
  hideRowActions,
  disableRowActions,
  maxInlineActions = 3,
  onRowClick,
  rowClassName,
  enableInlineForm = false,
  inlineFormContent,
  inlineFormClassName,
  inlineFormPosition = 'top',
}: DataTableViewProps<TData>) => {
  const { inlineFormState, isRowEditing, closeInlineForm } = useDataTable<TData>();

  // Calculate total column count for inline form
  const columnCount = columns.length + (rowActions.length > 0 ? 1 : 0);

  return (
    <TableBody>
      {table.getRowModel().rows.length > 0 ? (
        <>
          {/* Inline Form at Top (create mode or edit mode with 'top' position) */}
          {enableInlineForm &&
            inlineFormState.isOpen &&
            inlineFormPosition === 'top' &&
            inlineFormContent && (
              <DataTableInlineForm
                mode={inlineFormState.mode!}
                data={inlineFormState.editingRowData}
                rowId={inlineFormState.editingRowId}
                columnCount={columnCount}
                onClose={closeInlineForm}
                className={inlineFormClassName}>
                {inlineFormContent}
              </DataTableInlineForm>
            )}

          {/* Table Rows */}
          {table.getRowModel().rows.map((row) => {
            const isEditing = enableInlineForm && isRowEditing(row.id);

            // Replace row with form (edit mode with 'replace' position)
            if (isEditing && inlineFormPosition === 'replace' && inlineFormContent) {
              return (
                <DataTableInlineForm
                  key={row.id}
                  mode="edit"
                  data={row.original}
                  rowId={row.id}
                  columnCount={columnCount}
                  onClose={closeInlineForm}
                  className={inlineFormClassName}>
                  {inlineFormContent}
                </DataTableInlineForm>
              );
            }

            // Normal row rendering
            return (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                onClick={() => onRowClick?.(row.original)}
                className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row.original))}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'bg-table-cell px-4 py-2.5',
                      cell.column.columnDef.meta?.className
                    )}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
                {rowActions && rowActions.length > 0 && (
                  <TableCell className="bg-table-cell px-4 py-2.5">
                    <DataTableRowActions
                      row={row.original}
                      rowId={row.id}
                      actions={rowActions}
                      hideRowActions={hideRowActions}
                      disableRowActions={disableRowActions}
                      maxInlineActions={maxInlineActions}
                    />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </>
      ) : (
        <TableRow>
          <TableCell
            colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)}
            className="p-0 text-center">
            <EmptyContent
              variant="minimal"
              {...{
                title: "Try adjusting your search or filters to find what you're looking for.",
              }}
            />
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
};
