import {
  DataTableInlineContent,
  InlineContentRenderParams,
} from '../features/inline-content/data-table-inline-content';
import { useDataTable } from './data-table.context';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { cn } from '@shadcn/lib/utils';
import { TableBody, TableCell, TableRow } from '@shadcn/ui/table';
import { Table as TTable, flexRender } from '@tanstack/react-table';

export interface DataTableViewProps<TData> {
  table: TTable<TData>;
  columns: any[];
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  // Inline form props
  enableInlineContent?: boolean;
  inlineContent?: (params: InlineContentRenderParams<TData>) => React.ReactNode;
  inlineContentClassName?: string;
}

export const DataTableView = <TData,>({
  table,
  columns: _columns,
  onRowClick,
  rowClassName,
  enableInlineContent = false,
  inlineContent,
  inlineContentClassName,
}: DataTableViewProps<TData>) => {
  const { inlineContentState, isRowEditing, closeInlineContent } = useDataTable<TData>();

  // Calculate total column count for inline form
  const columnCount = table.getVisibleLeafColumns().length;

  return (
    <TableBody>
      {table.getRowModel().rows.length > 0 ? (
        <>
          {/* Inline Form at Top (create mode only) */}
          {enableInlineContent &&
            inlineContentState.isOpen &&
            inlineContentState.mode === 'create' &&
            inlineContent && (
              <DataTableInlineContent
                mode="create"
                data={null}
                columnCount={columnCount}
                onClose={closeInlineContent}
                className={inlineContentClassName}>
                {inlineContent}
              </DataTableInlineContent>
            )}

          {/* Table Rows */}
          {table.getRowModel().rows.map((row) => {
            const isEditing = enableInlineContent && isRowEditing(row.id);

            // Replace row with form (edit mode only)
            if (isEditing && inlineContent) {
              return (
                <DataTableInlineContent
                  key={row.id}
                  mode="edit"
                  data={row.original}
                  columnCount={columnCount}
                  onClose={closeInlineContent}
                  className={inlineContentClassName}>
                  {inlineContent}
                </DataTableInlineContent>
              );
            }

            // Normal row rendering
            return (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                onClick={(e) => {
                  e.stopPropagation();
                  // Skip row click when clicking on checkbox/select column
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-slot="checkbox"]')) return;
                  onRowClick?.(row.original);
                }}
                className={cn(
                  'bg-table-cell hover:bg-table-cell-hover relative transition-colors',
                  onRowClick && 'cursor-pointer',
                  row.getIsSelected() && 'bg-muted/50',
                  rowClassName?.(row.original)
                )}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn('px-4 py-3 text-xs', cell.column.columnDef.meta?.className)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </>
      ) : (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columnCount} className="p-0 whitespace-normal">
            <EmptyContent
              title="Try adjusting your search or filters"
              className="w-full rounded-none border-0"
            />
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
};
