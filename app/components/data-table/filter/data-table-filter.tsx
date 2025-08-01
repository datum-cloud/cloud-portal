import { CheckboxFilter } from './components/checkbox';
import { DatePickerFilter } from './components/datepicker';
import { RadioFilter } from './components/radio';
import { SearchFilter } from './components/search';
import { SelectFilter } from './components/select';
import { DataTableFilterProvider, FilterState, useDataTableFilter } from './filter.context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/utils/misc';
import { Table } from '@tanstack/react-table';
import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { ReactNode, useState } from 'react';

// Main DataTableFilter component props
export interface DataTableFilterProps {
  children: ReactNode;
  table?: Table<any>;
  onFiltersChange?: (filters: FilterState) => void;
  defaultFilters?: FilterState;
  className?: string;
  showHeader?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// Filter bar component (internal)
function FilterBar({
  children,
  className,
  showHeader = true,
  collapsible = true,
  defaultExpanded = false,
}: {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}) {
  const { hasActiveFilters, getActiveFilterCount, resetAllFilters } = useDataTableFilter();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasActiveFiltersValue = hasActiveFilters();
  const activeCount = getActiveFilterCount();

  if (!showHeader && !collapsible) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
      </div>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFiltersValue && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {activeCount}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFiltersValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFilters}
                  className="h-7 px-2 text-xs">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset
                </Button>
              )}
              {collapsible && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')}
                      />
                      <span className="sr-only">Toggle filters</span>
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      {collapsible ? (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {children}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <CardContent className={showHeader ? 'pt-0' : ''}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
        </CardContent>
      )}
    </Card>
  );
}

// Main component
function DataTableFilterBase({
  children,
  table,
  onFiltersChange,
  defaultFilters,
  className,
  showHeader = true,
  collapsible = true,
  defaultExpanded = false,
}: DataTableFilterProps) {
  return (
    <DataTableFilterProvider
      table={table}
      onFiltersChange={onFiltersChange}
      defaultFilters={defaultFilters}>
      <FilterBar
        className={className}
        showHeader={showHeader}
        collapsible={collapsible}
        defaultExpanded={defaultExpanded}>
        {children}
      </FilterBar>
    </DataTableFilterProvider>
  );
}

// Compound component structure
const DataTableFilter = Object.assign(DataTableFilterBase, {
  Search: SearchFilter,
  DatePicker: DatePickerFilter,
  Select: SelectFilter,
  Radio: RadioFilter,
  Checkbox: CheckboxFilter,
});

export { DataTableFilter };

// Export individual components for advanced usage
export { SearchFilter, DatePickerFilter, SelectFilter, RadioFilter, CheckboxFilter };

// Export context and hooks
export { useDataTableFilter, useFilter } from './filter.context';
export type { FilterState, FilterValue } from './filter.context';
