import { DataTableCardView } from './data-table-card-view';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableLoadingContent } from './data-table-loading';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { DataTableView } from './data-table-view';
import { DataTableProvider } from './data-table.context';
import { DataTableProps } from './data-table.types';
import { createGlobalSearchFilter } from './utils/global-search.helpers';
import { createNestedAccessor, getSortingFnByType } from './utils/sorting.helpers';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { cn } from '@shadcn/lib/utils';
import { Table } from '@shadcn/ui/table';
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Table as TTable,
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
  filters,
  defaultFilters,
  onFiltersChange,
  onFilteringStart,
  onFilteringEnd,
  serverSideFiltering = false,
  mode = 'table',
  hideHeader = false,
  hidePagination = false,
  className,
  rowActions = [],
  hideRowActions,
  disableRowActions,
  maxInlineActions = 3,
  onRowClick,
  rowClassName,
  tableTitle,
  toolbar,
  emptyContent = {
    title: 'No results.',
  },
  tableContainerClassName,
  tableClassName,
  tableCardClassName,
  isLoading,
  loadingText,
}: DataTableProps<TData, TValue>) => {
  // Deprecation warnings for old API
  if (process.env.NODE_ENV === 'development') {
    if (filterComponent && !filters) {
      console.warn(
        '[DataTable] The "filterComponent" prop is deprecated and will be removed in a future version. ' +
          'Please use the "filters" prop instead. Filters are now auto-wrapped in DataTableFilter context.\n' +
          'Example: filters={<><DataTableFilter.Select filterKey="status" /><DataTableFilter.DatePicker filterKey="date" /></>}'
      );
    }
    if (toolbar?.search && !toolbar?.includeSearch) {
      console.warn(
        '[DataTable] The "toolbar.search" prop is deprecated and will be removed in a future version. ' +
          'Please use "toolbar.includeSearch" instead to better reflect that search is just another filter.\n' +
          'Example: toolbar={{ includeSearch: { placeholder: "Search..." } }}'
      );
    }
  }

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
    ...(hidePagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
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

  // Determine if we have actual data (not just filtered out)
  const hasData = data && data.length > 0;
  const hasFilteredData = table.getFilteredRowModel().rows.length > 0;
  const isEmptyFromFilter = hasData && !hasFilteredData;

  // Show toolbar if:
  // 1. Not loading AND has data (even if filtered to 0 results)
  // 2. Has any toolbar content (title, filters, or toolbar config)
  const showToolbar =
    !isLoading && hasData && Boolean(filterComponent || filters || tableTitle || toolbar);

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
      <div className={cn('mx-auto flex h-full w-full flex-col gap-8', className)}>
        {/* Toolbar Section: Page Title + Filters */}
        {showToolbar && (
          <DataTableToolbar
            tableTitle={tableTitle}
            filterComponent={filterComponent}
            filters={filters}
            config={toolbar}
          />
        )}

        {isLoading ? (
          <DataTableLoadingContent title={loadingText} />
        ) : data?.length > 0 ? (
          <div className="space-y-6">
            {/* Table Section */}
            <div
              className={cn(
                'flex max-w-full flex-col overflow-hidden',
                mode === 'table' ? 'rounded-md border' : '',
                tableContainerClassName
              )}>
              <Table className={tableClassName}>
                {!hideHeader && (
                  <DataTableColumnHeader table={table} hasRowActions={rowActions.length > 0} />
                )}

                {mode === 'table' ? (
                  <DataTableView
                    table={table}
                    columns={columns}
                    rowActions={rowActions}
                    hideRowActions={hideRowActions}
                    disableRowActions={disableRowActions}
                    maxInlineActions={maxInlineActions}
                    onRowClick={onRowClick}
                    rowClassName={rowClassName}
                  />
                ) : (
                  <DataTableCardView
                    table={table}
                    columns={columns}
                    rowActions={rowActions}
                    hideRowActions={hideRowActions}
                    disableRowActions={disableRowActions}
                    maxInlineActions={maxInlineActions}
                    onRowClick={onRowClick}
                    hideHeader={hideHeader}
                    tableCardClassName={tableCardClassName}
                  />
                )}
              </Table>
            </div>

            {/* Pagination Section */}
            {!hidePagination && <DataTablePagination table={table} />}
          </div>
        ) : (
          <EmptyContent variant="dashed" {...emptyContent} />
        )}
      </div>
    </DataTableProvider>
  );
};
