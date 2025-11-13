import { DataTableRowActions } from './data-table-row-actions';
import { DataTableRowActionsProps } from './data-table.types';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { cn } from '@shadcn/lib/utils';
import { TableBody, TableCell, TableRow } from '@shadcn/ui/table';
import { Table as TTable, flexRender } from '@tanstack/react-table';

export interface DataTableCardViewProps<TData> {
  table: TTable<TData>;
  columns: any[];
  rowActions?: DataTableRowActionsProps<TData>[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions?: number;
  onRowClick?: (row: TData) => void;
  hideHeader?: boolean;
  tableCardClassName?: string;
}

export const DataTableCardView = <TData,>({
  table,
  columns,
  rowActions = [],
  hideRowActions,
  disableRowActions,
  maxInlineActions = 3,
  onRowClick,
  hideHeader = false,
  tableCardClassName,
}: DataTableCardViewProps<TData>) => {
  return (
    <TableBody>
      {table.getRowModel().rows.length > 0 ? (
        <>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="border-none hover:bg-transparent">
              <TableCell
                colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)}
                className={cn('p-0 pb-4', !hideHeader && 'first:pt-3')}>
                <div
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    'bg-card group relative rounded-lg border p-6 shadow-none transition-all duration-200',
                    'hover:border-primary hover:text-primary',
                    onRowClick && 'cursor-pointer',
                    row.getIsSelected() && 'ring-primary ring-2 ring-offset-2',
                    tableCardClassName
                  )}>
                  {/* Card Content */}
                  <div className="space-y-2">
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        className={cn('text-sm', cell.column.columnDef.meta?.className)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>

                  {/* Card Actions */}
                  {rowActions && rowActions.length > 0 && (
                    <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <DataTableRowActions
                        row={row.original}
                        actions={rowActions}
                        hideRowActions={hideRowActions}
                        disableRowActions={disableRowActions}
                        maxInlineActions={maxInlineActions}
                      />
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
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
