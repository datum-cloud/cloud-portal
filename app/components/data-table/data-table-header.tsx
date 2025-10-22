import { DataTableSort } from './data-table-sort';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/utils/common';
import { Table as TTable, flexRender } from '@tanstack/react-table';

export const DataTableHeader = <TData,>({
  table,
  hasRowActions = false,
}: {
  table: TTable<TData>;
  hasRowActions?: boolean;
}) => {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className="hover:bg-transparent">
          {headerGroup.headers.map((header) => {
            return (
              <TableHead
                key={header.id}
                className={cn('h-10', header.column.columnDef.meta?.className)}>
                {header.isPlaceholder ? null : (
                  <DataTableSort column={header.column}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </DataTableSort>
                )}
              </TableHead>
            );
          })}
          {hasRowActions && <TableHead className="h-10 w-[50px]" />}
        </TableRow>
      ))}
    </TableHeader>
  );
};
