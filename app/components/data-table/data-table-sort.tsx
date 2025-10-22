import { getSortLabels } from './utils/sort-labels';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/common';
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';

export interface DataTableSortProps<TData> {
  column: Column<TData>;
  children: React.ReactNode;
  className?: string;
}

export function DataTableSort<TData>({ column, children, className }: DataTableSortProps<TData>) {
  const [open, setOpen] = useState(false);
  const isSorted = column.getIsSorted();
  const canSort = column.getCanSort();

  if (!canSort) {
    return <div className={cn('flex items-center gap-2', className)}>{children}</div>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const getSortIcon = () => {
    if (!isSorted) {
      return (
        <ChevronsUpDown
          className="ml-2 size-4 shrink-0 opacity-40"
          strokeWidth={2}
          aria-hidden="true"
        />
      );
    }

    if (isSorted === 'asc') {
      return (
        <ChevronUp className="ml-2 size-4 shrink-0 opacity-60" strokeWidth={2} aria-hidden="true" />
      );
    }

    return (
      <ChevronDown className="ml-2 size-4 shrink-0 opacity-60" strokeWidth={2} aria-hidden="true" />
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'data-[state=open]:bg-accent -ml-3 h-8',
            isSorted && 'text-primary',
            className
          )}
          onClick={handleClick}
          aria-label={`Sort by ${column.columnDef.header as string}. ${
            isSorted
              ? `Currently sorted ${isSorted === 'asc' ? 'ascending' : 'descending'}`
              : 'Not sorted'
          }`}>
          <span>{children}</span>
          {getSortIcon()}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <SortMenu column={column} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

interface SortMenuProps<TData> {
  column: Column<TData>;
  onClose?: () => void;
}

function SortMenu<TData>({ column, onClose }: SortMenuProps<TData>) {
  const currentSort = column.getIsSorted();
  const sortType = column.columnDef.meta?.sortType;
  const customLabels = column.columnDef.meta?.sortLabels as
    | { asc?: string; desc?: string }
    | undefined;

  const labels = getSortLabels(sortType, customLabels);

  const handleSort = (direction: 'asc' | 'desc') => {
    column.toggleSorting(direction === 'desc');
    onClose?.();
  };

  const handleClear = () => {
    column.clearSorting();
    onClose?.();
  };

  return (
    <div className="w-56 p-1">
      <div className="text-muted-foreground mb-2 px-2 py-1.5 text-xs font-medium">
        Sort by: {column.columnDef.header as string}
      </div>

      <div className="space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-2 font-normal',
            currentSort === 'asc' && 'bg-accent'
          )}
          onClick={() => handleSort('asc')}>
          <ArrowUp className="size-4" />
          <span className="flex-1 text-left">{labels.asc}</span>
          {currentSort === 'asc' && <span className="text-primary">✓</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'w-full justify-start gap-2 font-normal',
            currentSort === 'desc' && 'bg-accent'
          )}
          onClick={() => handleSort('desc')}>
          <ArrowDown className="size-4" />
          <span className="flex-1 text-left">{labels.desc}</span>
          {currentSort === 'desc' && <span className="text-primary">✓</span>}
        </Button>

        {currentSort && (
          <>
            <div className="bg-border my-1 h-px" />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground w-full justify-start gap-2 font-normal"
              onClick={handleClear}>
              <X className="size-4" />
              <span>Clear Sort</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
