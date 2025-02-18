/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  SortingState,
  useReactTable,
  Table as TTable,
  flexRender,
} from '@tanstack/react-table'
import { useState } from 'react'
import { DataTableProps } from './data-table.types'
import { DataTableProvider } from '@/providers/dataTable.provider'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/utils/misc'
import { DataTableRowActions } from './data-table-row-actions'
import { DataTableTitle } from './data-table-title'
import { Loader2 } from 'lucide-react'
import { DataTableHeader } from './data-table-header'
import { DataTablePagination } from './data-table-pagination'
export const DataTable = <TData, TValue>({
  columns,
  data,
  defaultColumnFilters = [],
  defaultSorting = [],
  filterFields = [],
  className,
  rowActions = [],
  tableTitle,
  isLoading = false,
  loadingText = 'Loading...',
  emptyText = 'No results.',
}: DataTableProps<TData, TValue>) => {
  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(defaultColumnFilters)
  const [sorting, setSorting] = useState<SortingState>(defaultSorting)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  // TODO: enable this functionality when you want to use the column visibility feature and search functionality
  // const [columnVisibility, setColumnVisibility] = useLocalStorage<VisibilityState>(
  //   'data-table-visibility',
  //   {},
  // )
  // const [_, setSearch] = useQueryStates(searchParamsParser)

  const table: TTable<TData> = useReactTable({
    data,
    columns,
    state: { columnFilters, sorting, pagination },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    // REMINDER: it doesn't support array of strings (WARNING: might not work for other types)
    getFacetedUniqueValues: (table: TTable<TData>, columnId: string) => () => {
      const facets = getFacetedUniqueValues<TData>()(table, columnId)()
      const customFacets = new Map()
      for (const [key, value] of facets as any) {
        if (Array.isArray(key)) {
          for (const k of key) {
            const prevValue = customFacets.get(k) || 0
            customFacets.set(k, prevValue + value)
          }
        } else {
          const prevValue = customFacets.get(key) || 0
          customFacets.set(key, prevValue + value)
        }
      }
      return customFacets
    },
  })

  // TODO: enable this functionality when you want to use search functionality
  // useEffect(() => {
  //   const columnFiltersWithNullable = filterFields.map((field) => {
  //     const filterValue = columnFilters.find((filter) => filter.id === field.value)
  //     if (!filterValue) return { id: field.value, value: null }
  //     return { id: field.value, value: filterValue.value }
  //   })

  //   const search = columnFiltersWithNullable.reduce(
  //     (prev, curr) => {
  //       prev[curr.id as string] = curr.value
  //       return prev
  //     },
  //     {} as Record<string, unknown>,
  //   )

  //   setSearch(search)

  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [columnFilters])

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      filterFields={filterFields}
      columnFilters={columnFilters}
      sorting={sorting}
      // REMINDER: default values for the `/infinite` table
      rowSelection={{}}
      columnOrder={[]}
      columnVisibility={{}}
      enableColumnOrdering={false}
      isLoading={undefined}>
      <div className={cn('flex h-full w-full flex-col gap-4', className)}>
        {/* Header Section */}
        {tableTitle && <DataTableTitle {...tableTitle} />}

        {/* Table Section */}
        <div className="flex min-h-96 max-w-full flex-col overflow-hidden">
          <Table>
            <DataTableHeader table={table} hasRowActions={rowActions.length > 0} />

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-muted-foreground">{loadingText}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                    {rowActions && rowActions.length > 0 && (
                      <TableCell>
                        <DataTableRowActions row={row.original} actions={rowActions} />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Section */}
        {table.getPageCount() > 0 && <DataTablePagination table={table} />}
      </div>
    </DataTableProvider>
  )
}
