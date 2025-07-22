'use client';

import { useFilterContext, useHasActiveFilters } from './data-table-filter-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';

/**
 * FilterToolbar - A utility component that shows active filters and provides clear actions
 *
 * This component demonstrates practical usage of the filter context hooks.
 * It can be used alongside or instead of individual filter components.
 *
 * @example
 * ```tsx
 * <DataTableFilter onFiltersChange={handleFiltersChange}>
 *   <DataTableFilter.Search placeholder="Search..." />
 *   <DataTableFilter.Select options={statusOptions} filterKey="status" />
 *   <FilterToolbar />
 * </DataTableFilter>
 * ```
 */
export const FilterToolbar = () => {
  const { filters, clearFilter, clearAllFilters } = useFilterContext();
  const hasActiveFilters = useHasActiveFilters();

  if (!hasActiveFilters) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Filter className="h-4 w-4" />
        <span>No active filters</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground flex items-center gap-1 text-sm">
        <Filter className="h-4 w-4" />
        <span>Active filters:</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {Object.entries(filters).map(([key, value]) => (
          <Badge key={key} variant="secondary" className="flex items-center gap-1 pr-1">
            <span className="text-xs font-medium">{key}:</span>
            <span className="text-xs">{String(value)}</span>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-destructive hover:text-destructive-foreground h-auto p-0.5"
              onClick={() => clearFilter(key)}>
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs">
        Clear All
      </Button>
    </div>
  );
};
