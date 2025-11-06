import { useDataTableFilter } from './data-table.context';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@shadcn/ui/dropdown-menu';
import { Filter, RotateCcw } from 'lucide-react';
import { ReactNode, useState } from 'react';

export interface DataTableToolbarFilterDropdownProps {
  children: ReactNode;
  showFilterCount?: boolean;
  className?: string;
  dropdownClassName?: string;
}

/**
 * DataTableToolbarFilterDropdown
 *
 * Dropdown component that wraps filters in a collapsible menu.
 * Used in compact toolbar layout to save space.
 *
 * Features:
 * - Shows active filter count badge
 * - Clear all filters button
 * - Accessible dropdown menu
 * - Responsive width
 */
export const DataTableToolbarFilterDropdown = ({
  children,
  showFilterCount = true,
  className,
  dropdownClassName,
}: DataTableToolbarFilterDropdownProps) => {
  const { hasActiveFilters, getActiveFilterCount, resetAllFilters } = useDataTableFilter();
  const [open, setOpen] = useState(false);

  const hasFilters = hasActiveFilters();
  const filterCount = getActiveFilterCount();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="secondary"
          theme="outline"
          size="small"
          className={cn('h-9 gap-1.5', className)}>
          <Filter className="h-4 w-4" />
          Filters
          {showFilterCount && hasFilters && (
            <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs">
              {filterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn('max-h-[600px] w-80 overflow-y-auto p-4', dropdownClassName)}>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-semibold">Filters</span>
            {hasFilters && (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {filterCount} active
              </span>
            )}
          </div>
          {hasFilters && (
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              onClick={resetAllFilters}
              className="hover:text-destructive h-7 px-2 text-xs">
              <RotateCcw className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Filter Content */}
        <div className="space-y-4">{children}</div>

        {/* Footer Actions */}
        <div className="mt-4 flex justify-end gap-2 border-t pt-4">
          <Button
            type="quaternary"
            theme="borderless"
            size="small"
            onClick={() => setOpen(false)}
            className="h-8">
            Close
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
