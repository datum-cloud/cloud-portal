import { DataTableRowActions } from './data-table-row-actions';
import { DataTableRowActionsProps } from './data-table.types';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { cn } from '@shadcn/lib/utils';
import { TableBody, TableCell, TableRow } from '@shadcn/ui/table';
import { Table as TTable, flexRender } from '@tanstack/react-table';

export interface DataTableViewProps<TData> {
  table: TTable<TData>;
  columns: any[];
  rowActions?: DataTableRowActionsProps<TData>[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions?: number;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
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
}: DataTableViewProps<TData>) => {
  return (
    <TableBody>
      {table.getRowModel().rows.length > 0 ? (
        <>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
              onClick={() => onRowClick?.(row.original)}
              className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row.original))}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cn(cell.column.columnDef.meta?.className)}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
              {rowActions && rowActions.length > 0 && (
                <TableCell className="p-2">
                  <DataTableRowActions
                    row={row.original}
                    actions={rowActions}
                    hideRowActions={hideRowActions}
                    disableRowActions={disableRowActions}
                    maxInlineActions={maxInlineActions}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </>
      ) : (
        <TableRow>
          <TableCell
            colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)}
            className="h-24 text-center">
            <EmptyContent
              variant="minimal"
              {...{
                title: 'No results found',
                subtitle: "Try adjusting your search or filters to find what you're looking for.",
              }}
            />
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
};
