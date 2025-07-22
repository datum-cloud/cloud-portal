'use client';

import { useFilterValue, useFilterUpdater, useFilterClearer } from './data-table-filter-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/misc';

interface QuickFilterOption {
  label: string;
  value: string;
}

interface QuickFilterProps {
  filterKey: string;
  options: QuickFilterOption[];
  label?: string;
  className?: string;
}

/**
 * QuickFilter - A button-based filter component using context hooks
 *
 * This component demonstrates how to create custom filter components
 * using the filter context hooks instead of managing URL state directly.
 *
 * @example
 * ```tsx
 * <DataTableFilter onFiltersChange={handleFiltersChange}>
 *   <QuickFilter
 *     filterKey="priority"
 *     label="Priority"
 *     options={[
 *       { label: 'High', value: 'high' },
 *       { label: 'Medium', value: 'medium' },
 *       { label: 'Low', value: 'low' }
 *     ]}
 *   />
 * </DataTableFilter>
 * ```
 */
export const QuickFilter = ({ filterKey, options, label, className }: QuickFilterProps) => {
  const currentValue = useFilterValue(filterKey);
  const updateFilter = useFilterUpdater(filterKey);
  const clearFilter = useFilterClearer(filterKey);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && <span className="text-muted-foreground text-sm font-medium">{label}:</span>}

      <div className="flex items-center gap-1">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={currentValue === option.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (currentValue === option.value) {
                clearFilter();
              } else {
                updateFilter(option.value);
              }
            }}
            className="text-xs">
            {option.label}
          </Button>
        ))}

        {currentValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            className="text-muted-foreground hover:text-foreground text-xs">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
