import { useDataTableFilter } from '../../core/data-table.context';
import { Badge, Button } from '@datum-ui/components';
import { ResponsiveDropdown } from '@datum-ui/components/responsive-dropdown';
import { cn } from '@shadcn/lib/utils';
import { ListFilter } from 'lucide-react';
import { ReactNode, useState } from 'react';

export interface DataTableToolbarFilterDropdownProps {
  children: ReactNode;
  showFilterCount?: boolean;
  className?: string;
  dropdownClassName?: string;
  excludeColumns?: string[];
}

/**
 * DataTableToolbarFilterDropdown
 *
 * Dropdown on desktop/tablet, bottom sheet on mobile.
 * Used in compact toolbar layout to save space.
 */
export const DataTableToolbarFilterDropdown = ({
  children,
  showFilterCount = true,
  className,
  dropdownClassName,
  excludeColumns,
}: DataTableToolbarFilterDropdownProps) => {
  const { hasActiveFilters, getActiveFilterCount } = useDataTableFilter();
  const [open, setOpen] = useState(false);

  const hasFilters = hasActiveFilters(excludeColumns);
  const filterCount = getActiveFilterCount(excludeColumns);

  return (
    <ResponsiveDropdown
      open={open}
      onOpenChange={setOpen}
      sheetTitle="Filters"
      sheetDescription="Filter table data"
      align="end"
      contentClassName={cn(
        'max-h-[600px] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-4',
        dropdownClassName
      )}
      trigger={
        <Button
          type="secondary"
          theme="outline"
          size="small"
          className={cn('border-secondary/20 hover:border-secondary h-9 gap-1.5', className)}>
          <ListFilter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {showFilterCount && hasFilters && (
            <Badge type="primary" theme="solid" className="text-2xs px-1 py-0.5">
              {filterCount}
            </Badge>
          )}
        </Button>
      }>
      <div className="space-y-4 p-4 sm:p-0">{children}</div>
    </ResponsiveDropdown>
  );
};
