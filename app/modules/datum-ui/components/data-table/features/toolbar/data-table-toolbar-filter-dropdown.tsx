import { useDataTableFilter } from '../../core/data-table.context';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@shadcn/ui/dropdown-menu';
import { ListFilter } from 'lucide-react';
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
  const { hasActiveFilters, getActiveFilterCount } = useDataTableFilter();
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
          className={cn('border-secondary/20 hover:border-secondary h-9 gap-1.5', className)}>
          <ListFilter className="h-4 w-4" />
          Filters
          {showFilterCount && hasFilters && (
            <span className="bg-primary text-primary-foreground text-2xs ml-1 size-4 rounded-md">
              {filterCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className={cn('max-h-[600px] w-80 overflow-y-auto p-4', dropdownClassName)}>
        {/* Filter Content */}
        <div className="space-y-4">{children}</div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
