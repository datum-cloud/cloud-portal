import { Button } from '@datum-ui/components';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Table as TTable } from '@tanstack/react-table';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export const DataTablePagination = <TData,>({
  table,
  enableShowAll = false,
}: {
  table: TTable<TData>;
  enableShowAll?: boolean;
}) => {
  const totalRows = table.getFilteredRowModel().rows.length;
  const currentPageSize = table.getState().pagination.pageSize;

  const [isShowingAll, setIsShowingAll] = useState(false);

  return (
    <div className="flex items-center justify-between space-x-4 md:space-x-6 lg:space-x-8">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={isShowingAll ? 'all' : `${currentPageSize}`}
            onValueChange={(value) => {
              if (value === 'all') {
                table.setPageSize(totalRows);
                setIsShowingAll(true);
              } else {
                table.setPageSize(Number(value));
                setIsShowingAll(false);
              }
            }}>
            <SelectTrigger className="border-secondary/20 hover:border-secondary w-[70px] transition-all">
              <SelectValue placeholder={isShowingAll ? 'All' : currentPageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
              {enableShowAll && (
                <SelectItem key="all" value="all">
                  All
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      {!isShowingAll && (
        <div className="flex items-center space-x-2">
          <div className="mr-5 flex items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <Button
            type="secondary"
            theme="outline"
            className="disabled:cursor-not-allowed disabled:opacity-20"
            onClick={() => {
              table.previousPage();
            }}
            disabled={!table.getCanPreviousPage()}>
            <span className="sr-only">Go to previous page</span>
            <Icon icon={ArrowLeft} className="size-4" />
          </Button>
          <Button
            type="secondary"
            theme="outline"
            className="disabled:cursor-not-allowed disabled:opacity-20"
            onClick={() => {
              table.nextPage();
            }}
            disabled={!table.getCanNextPage()}>
            <span className="sr-only">Go to next page</span>
            <Icon icon={ArrowRight} className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
