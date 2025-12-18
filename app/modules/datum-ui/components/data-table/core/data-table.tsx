import { DataTableColumnHeader } from '../features/columns/data-table-column-header';
import { DataTablePagination } from '../features/pagination/data-table-pagination';
import { DataTableToolbar } from '../features/toolbar/data-table-toolbar';
import { createGlobalSearchFilter } from '../utils/global-search.helpers';
import { createNestedAccessor, getSortingFnByType } from '../utils/sorting.helpers';
import { DataTableCardView } from './data-table-card-view';
import { DataTableLoadingContent } from './data-table-loading';
import { DataTableView } from './data-table-view';
import { DataTableProvider, useDataTable } from './data-table.context';
import { DataTableProps, DataTableRef } from './data-table.types';
import { EmptyContent } from '@/components/empty-content/empty-content';
import { cn } from '@shadcn/lib/utils';
import { Table } from '@shadcn/ui/table';
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  PaginationState,
  Row,
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
import { forwardRef, useImperativeHandle, useMemo, useState, useRef, Ref } from 'react';

// Extend TanStack Table's FilterFns interface to include our custom filter functions
declare module '@tanstack/react-table' {
  interface FilterFns {
    arrayOr: FilterFn<unknown>;
  }
}

/**
 * Custom filter function that supports both OR (arrIncludesSome) and AND logic
 * Works with both array and non-array column values
 *
 * - When filterValue is an array: checks if column value matches ANY of the filter values (OR logic)
 * - When filterValue is a string: checks if column value includes the string
 */
const arrayOrFilter: FilterFn<any> = <TData,>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown
): boolean => {
  const cellValue = row.getValue(columnId);

  // If no filter value, show all
  if (filterValue === null || filterValue === undefined || filterValue === '') {
    return true;
  }

  // If filter value is an array (multi-select)
  if (Array.isArray(filterValue)) {
    // Empty array means no filter
    if (filterValue.length === 0) {
      return true;
    }

    // If cell value is also an array, check if ANY filter value is in the cell array
    if (Array.isArray(cellValue)) {
      return filterValue.some((val) => cellValue.includes(val));
    }

    // If cell value is a single value, check if it's in the filter array
    return filterValue.includes(cellValue);
  }

  // If filter value is a string (single select or search)
  if (typeof filterValue === 'string') {
    if (Array.isArray(cellValue)) {
      return cellValue.some((val) => String(val).toLowerCase().includes(filterValue.toLowerCase()));
    }
    return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
  }

  // Fallback: exact match
  return cellValue === filterValue;
};

// Internal component that wraps the table content and provides ref access
function DataTableInternal<TData, TValue>(
  {
    columns,
    data,
    defaultColumnFilters = [],
    defaultSorting = [],
    pageSize = 50,
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
    // Inline content props
    enableInlineContent = false,
    inlineContent,
    inlineContentClassName,
    onInlineContentOpen,
    onInlineContentClose,
  }: DataTableProps<TData, TValue>,
  ref: Ref<DataTableRef<TData>>
) {
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
    // Custom filter functions registry
    filterFns: {
      arrayOr: arrayOrFilter, // OR logic for multi-select filters
    },
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
  // const showToolbar =
  //   !isLoading && hasData && Boolean(filterComponent || filters || tableTitle || toolbar);

  // So currently we are showing the toolbar always
  const showToolbar = true;

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
      globalSearchOptionsRef={globalSearchOptionsRef}
      onInlineContentOpen={onInlineContentOpen}
      onInlineContentClose={onInlineContentClose}>
      <DataTableContent
        ref={ref}
        className={className}
        showToolbar={showToolbar}
        tableTitle={tableTitle}
        filterComponent={filterComponent}
        filters={filters}
        toolbar={toolbar}
        isLoading={isLoading}
        loadingText={loadingText}
        hasData={hasData}
        data={data}
        mode={mode}
        hideHeader={hideHeader}
        table={table}
        columns={columns}
        rowActions={rowActions}
        hideRowActions={hideRowActions}
        disableRowActions={disableRowActions}
        maxInlineActions={maxInlineActions}
        onRowClick={onRowClick}
        rowClassName={rowClassName}
        tableContainerClassName={tableContainerClassName}
        tableClassName={tableClassName}
        tableCardClassName={tableCardClassName}
        hidePagination={hidePagination}
        emptyContent={emptyContent}
        enableInlineContent={enableInlineContent}
        inlineContent={inlineContent}
        inlineContentClassName={inlineContentClassName}
      />
    </DataTableProvider>
  );
}

// Content component that has access to context and provides ref
interface DataTableContentProps<TData, TValue> {
  className?: string;
  showToolbar: boolean;
  tableTitle?: any;
  filterComponent?: React.ReactNode;
  filters?: React.ReactNode;
  toolbar?: any;
  isLoading?: boolean;
  loadingText?: string;
  hasData: boolean;
  data: TData[];
  mode: 'table' | 'card';
  hideHeader: boolean;
  table: TTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  rowActions: any[];
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions: number;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  tableContainerClassName?: string;
  tableClassName?: string;
  tableCardClassName?: string | ((row: TData) => string | undefined);
  hidePagination: boolean;
  emptyContent: any;
  enableInlineContent: boolean;
  inlineContent?: any;
  inlineContentClassName?: string;
}

const DataTableContent = forwardRef(function DataTableContent<TData, TValue>(
  {
    className,
    showToolbar,
    tableTitle,
    filterComponent,
    filters,
    toolbar,
    isLoading,
    loadingText,
    hasData,
    data,
    mode,
    hideHeader,
    table,
    columns,
    rowActions,
    hideRowActions,
    disableRowActions,
    maxInlineActions,
    onRowClick,
    rowClassName,
    tableContainerClassName,
    tableClassName,
    tableCardClassName,
    hidePagination,
    emptyContent,
    enableInlineContent,
    inlineContent,
    inlineContentClassName,
  }: DataTableContentProps<TData, TValue>,
  ref: Ref<DataTableRef<TData>>
) {
  const { openInlineContent, closeInlineContent, inlineContentState } = useDataTable<TData>();

  // Expose ref methods for external control
  useImperativeHandle(
    ref,
    () => ({
      openCreate: () => {
        openInlineContent('create');
      },
      openEdit: (rowId: string, rowData: TData) => {
        openInlineContent('edit', rowData, rowId);
      },
      close: () => {
        closeInlineContent();
      },
      getState: () => ({
        isOpen: inlineContentState.isOpen,
        mode: inlineContentState.mode,
        editingRowId: inlineContentState.editingRowId,
      }),
    }),
    [openInlineContent, closeInlineContent, inlineContentState]
  );

  return (
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
              mode === 'table' ? 'rounded-lg border' : '',
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
                  enableInlineContent={enableInlineContent}
                  inlineContent={inlineContent}
                  inlineContentClassName={inlineContentClassName}
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
        <EmptyContent {...emptyContent} />
      )}
    </div>
  );
}) as <TData, TValue>(
  props: DataTableContentProps<TData, TValue> & { ref?: Ref<DataTableRef<TData>> }
) => React.ReactElement;

// Main export with generic support and forwardRef
export const DataTable = forwardRef(DataTableInternal) as <TData, TValue>(
  props: DataTableProps<TData, TValue> & { ref?: Ref<DataTableRef<TData>> }
) => React.ReactElement;
