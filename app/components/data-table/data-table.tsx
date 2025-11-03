import { DataTableHeader } from './data-table-header';
import { DataTableLoadingContent } from './data-table-loading';
import { DataTablePagination } from './data-table-pagination';
import { DataTableRowActions } from './data-table-row-actions';
import { DataTableProvider } from './data-table.context';
import { DataTableProps } from './data-table.types';
import { createGlobalSearchFilter } from './utils/global-search.helpers';
import { createNestedAccessor, getSortingFnByType } from './utils/sorting.helpers';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { PageTitle } from '@/components/page-title/page-title';
import { cn } from '@shadcn/lib/utils';
import { Table, TableBody, TableCell, TableRow } from '@shadcn/ui/table';
import {
  ColumnDef,
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
import { useMemo, useState, useRef } from 'react';

export const DataTable = <TData, TValue>({
  columns,
  data,
  defaultColumnFilters = [],
  defaultSorting = [],
  pageSize = 20,
  filterComponent,
  defaultFilters,
  onFiltersChange,
  onFilteringStart,
  onFilteringEnd,
  serverSideFiltering = false,
  mode = 'table',
  hideHeader = false,
  className,
  rowActions = [],
  hideRowActions,
  disableRowActions,
  maxInlineActions = 3,
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
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  });

  // Store global search options in a ref for dynamic access
  const globalSearchOptionsRef = useRef<{
    searchableColumns?: string[];
    excludeColumns?: string[];
  }>({});

  // Enhance columns with smart sorting based on meta configuration
  const enhancedColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    return columns.map((col): ColumnDef<TData, TValue> => {
      const meta = col.meta;

      // Skip if sorting is explicitly disabled
      if (meta?.sortable === false || col.enableSorting === false) {
        return { ...col, enableSorting: false };
      }

      // If sortPath is provided, create accessorFn and sortingFn
      if (meta?.sortPath) {
        const baseCol = col as any;
        return {
          ...col,
          accessorFn: baseCol.accessorFn || createNestedAccessor<TData>(meta.sortPath),
          sortingFn: meta.sortType
            ? getSortingFnByType(meta.sortType, { sortArrayBy: meta.sortArrayBy })
            : undefined,
          enableSorting: true,
        } as ColumnDef<TData, TValue>;
      }

      // If sortType is provided without sortPath, just apply the sorting function
      if (meta?.sortType) {
        return {
          ...col,
          sortingFn: getSortingFnByType(meta.sortType, { sortArrayBy: meta.sortArrayBy }),
          enableSorting: true,
        };
      }

      // Return column as-is if no meta sorting config
      return col;
    });
  }, [columns]);

  // Create global search filter function with dynamic options
  const globalFilterFn = useMemo(
    () =>
      createGlobalSearchFilter(
        enhancedColumns,
        {
          caseSensitive: false,
          matchMode: 'contains',
          searchNestedFields: true,
        },
        () => globalSearchOptionsRef.current
      ),
    [enhancedColumns]
  );

  const table: TTable<TData> = useReactTable({
    data,
    columns: enhancedColumns,
    state: { columnFilters, sorting, pagination, globalFilter },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
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
      globalFilter={globalFilter}
      enableColumnOrdering={false}
      isLoading={isLoading}
      defaultFilters={defaultFilters}
      onFiltersChange={onFiltersChange}
      onFilteringStart={onFilteringStart}
      onFilteringEnd={onFilteringEnd}
      serverSideFiltering={serverSideFiltering}
      globalSearchOptionsRef={globalSearchOptionsRef}>
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
                  {mode === 'table' ? (
                    // Traditional table rows
                    table.getRowModel().rows.length > 0 ? (
                      <>
                        {table.getRowModel().rows.map((row) => (
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
                              subtitle:
                                "Try adjusting your search or filters to find what you're looking for.",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  ) : (
                    // Card-style rows
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Section */}
            <DataTablePagination table={table} />
          </>
        ) : (
          <EmptyContent variant="dashed" {...emptyContent} />
        )}
      </div>
    </DataTableProvider>
  );
};
