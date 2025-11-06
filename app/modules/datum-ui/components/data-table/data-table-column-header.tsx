import { cn } from '@shadcn/lib/utils';
import { TableHead, TableHeader, TableRow } from '@shadcn/ui/table';
import { Table as TTable, flexRender } from '@tanstack/react-table';
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';

export interface DataTableColumnHeaderProps<TData> {
  table: TTable<TData>;
  hasRowActions?: boolean;
}

export const DataTableColumnHeader = <TData,>({
  table,
  hasRowActions = false,
}: DataTableColumnHeaderProps<TData>) => {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className="hover:bg-transparent">
          {headerGroup.headers.map((header) => {
            return (
              <TableHead
                key={header.id}
                className={cn(
                  'hover:text-primary h-10 transition-colors',
                  header.column.columnDef.meta?.className
                )}>
                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                  <div
                    className={cn(
                      header.column.getCanSort() &&
                        'flex h-full cursor-pointer items-center justify-between gap-1 select-none'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e) => {
                      // Enhanced keyboard handling for sorting
                      if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        header.column.getToggleSortingHandler()?.(e);
                      }
                    }}
                    tabIndex={header.column.getCanSort() ? 0 : undefined}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() ? (
                      {
                        asc: <ChevronUp size={16} aria-hidden="true" />,
                        desc: <ChevronDown size={16} aria-hidden="true" />,
                      }[header.column.getIsSorted() as string]
                    ) : (
                      <ChevronsUpDown className="opacity-60" size={16} aria-hidden="true" />
                    )}
                  </div>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
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
