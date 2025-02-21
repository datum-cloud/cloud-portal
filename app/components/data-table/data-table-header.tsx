import { flexRender, Table as TTable } from '@tanstack/react-table'
import { TableRow, TableHeader, TableHead } from '@/components/ui/table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/utils/misc'

export const DataTableHeader = <TData,>({
  table,
  hasRowActions = false,
}: {
  table: TTable<TData>
  hasRowActions?: boolean
}) => {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id} className="hover:bg-transparent">
          {headerGroup.headers.map((header) => {
            return (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                  <div
                    className={cn(
                      header.column.getCanSort() &&
                        'flex h-full cursor-pointer select-none items-center justify-between gap-2',
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    onKeyDown={(e) => {
                      // Enhanced keyboard handling for sorting
                      if (
                        header.column.getCanSort() &&
                        (e.key === 'Enter' || e.key === ' ')
                      ) {
                        e.preventDefault()
                        header.column.getToggleSortingHandler()?.(e)
                      }
                    }}
                    tabIndex={header.column.getCanSort() ? 0 : undefined}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() ? (
                      {
                        asc: (
                          <ChevronUp
                            className="shrink-0 opacity-60"
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        ),
                        desc: (
                          <ChevronDown
                            className="shrink-0 opacity-60"
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        ),
                      }[header.column.getIsSorted() as string]
                    ) : (
                      <ChevronsUpDown
                        className="shrink-0 opacity-40"
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </TableHead>
            )
          })}
          {hasRowActions && <TableHead className="w-[50px]" />}
        </TableRow>
      ))}
    </TableHeader>
  )
}
