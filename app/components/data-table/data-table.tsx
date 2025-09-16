import { DataTableHeader } from './data-table-header';
import { DataTablePagination } from './data-table-pagination';
import { DataTableRowActions } from './data-table-row-actions';
import { DataTableProvider } from './data-table.context';
import { DataTableProps } from './data-table.types';
import { DataTableLoadingContent } from '@/components/data-table/data-table-loading';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { PageTitle } from '@/components/page-title/page-title';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/utils/common';
import {
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Table as TTable,
  flexRender,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';

export const DataTable = <TData, TValue>({
  columns,
  data,
  defaultColumnFilters = [],
  defaultSorting = [],
  filterComponent,
  defaultFilters,
  onFiltersChange,
  serverSideFiltering = false,
  mode = 'table',
  hideHeader = false,
  className,
  rowActions = [],
  onRowClick,
  rowClassName,
  tableTitle,
  emptyContent = {
    title: 'No results.',
  },
  tableContainerClassName,
  tableClassName,
  tableCardClassName,
  isLoading,
  loadingText,
}: DataTableProps<TData, TValue>) => {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(defaultColumnFilters);
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

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
      const facets = getFacetedUniqueValues<TData>()(table, columnId)();
      const customFacets = new Map();
      for (const [key, value] of facets as any) {
        if (Array.isArray(key)) {
          for (const k of key) {
            const prevValue = customFacets.get(k) || 0;
            customFacets.set(k, prevValue + value);
          }
        } else {
          const prevValue = customFacets.get(key) || 0;
          customFacets.set(key, prevValue + value);
        }
      }
      return customFacets;
    },
  });

  return (
    <DataTableProvider
      table={table}
      columns={columns}
      columnFilters={columnFilters}
      sorting={sorting}
      rowSelection={{}}
      columnOrder={[]}
      columnVisibility={{}}
      enableColumnOrdering={false}
      isLoading={isLoading}
      defaultFilters={defaultFilters}
      onFiltersChange={onFiltersChange}
      serverSideFiltering={serverSideFiltering}>
      <div
        className={cn(
          'mx-auto flex h-full w-full flex-col gap-4',
          !isLoading && data?.length > 0 ? 'max-w-(--breakpoint-xl)' : '',
          className
        )}>
        {filterComponent && (
          <>
            {/* Header Section */}
            {tableTitle && <PageTitle {...tableTitle} />}

            {/* Filter Section */}
            {filterComponent}
          </>
        )}

        {isLoading ? (
          <DataTableLoadingContent title={loadingText} />
        ) : data?.length > 0 ? (
          <>
            {!filterComponent && tableTitle && <PageTitle {...tableTitle} />}
            {/* Table Section */}
            <div
              className={cn(
                'flex max-w-full flex-col overflow-hidden',
                mode === 'table' ? 'rounded-md border' : '',
                tableContainerClassName
              )}>
              <Table className={tableClassName}>
                {!hideHeader && (
                  <DataTableHeader table={table} hasRowActions={rowActions.length > 0} />
                )}

                <TableBody>
                  {mode === 'table'
                    ? // Traditional table rows
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          onClick={() => onRowClick?.(row.original)}
                          className={cn(
                            onRowClick && 'cursor-pointer',
                            rowClassName?.(row.original)
                          )}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn(cell.column.columnDef.meta?.className)}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                          {rowActions && rowActions.length > 0 && (
                            <TableCell className="p-2">
                              <DataTableRowActions row={row.original} actions={rowActions} />
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    : // Card-style rows
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="border-none hover:bg-transparent">
                          <TableCell
                            colSpan={columns.length + (rowActions.length > 0 ? 1 : 0)}
                            className={cn('p-0 pb-2', !hideHeader && 'first:pt-3')}>
                            <div
                              onClick={() => onRowClick?.(row.original)}
                              className={cn(
                                'bg-card group relative rounded-lg border p-4 shadow-sm transition-all duration-200',
                                'hover:border-primary/20 hover:shadow-md',
                                onRowClick && 'cursor-pointer',
                                row.getIsSelected() && 'ring-primary ring-2 ring-offset-2',
                                tableCardClassName
                              )}>
                              {/* Card Content */}
                              <div className="space-y-2">
                                {row.getVisibleCells().map((cell) => (
                                  <div
                                    key={cell.id}
                                    className={cn(
                                      'text-foreground dark:text-cream text-sm',
                                      cell.column.columnDef.meta?.className
                                    )}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ))}
                              </div>

                              {/* Card Actions */}
                              {rowActions && rowActions.length > 0 && (
                                <div className="absolute top-2 right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                  <DataTableRowActions row={row.original} actions={rowActions} />
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Section */}
            {(data ?? [])?.length > 10 && <DataTablePagination table={table} />}
          </>
        ) : (
          <EmptyContent variant="dashed" {...emptyContent} />
        )}
      </div>
    </DataTableProvider>
  );
};
