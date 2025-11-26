import { useDataTableFilter } from '../../core/data-table.context';
import { CheckboxFilter } from './components/checkbox';
import { CheckboxPopoverFilter } from './components/checkbox-popover';
import { DatePickerFilter } from './components/datepicker';
import { GlobalSearchFilter } from './components/global-search';
import { RadioFilter } from './components/radio';
import { RadioPopoverFilter } from './components/radio-popover';
import { SearchFilter } from './components/search';
import { SelectFilter } from './components/select';
import { TagFilter } from './components/tag';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { ReactNode, useState, Children } from 'react';

// Main DataTableFilter component props - simplified since provider handles table/filters
export interface DataTableFilterProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  variant?: 'default' | 'card'; // 'default' = simple filters without card, 'card' = wrapped in card with optional collapsible
}

// Filter bar component (internal)
function FilterBar({
  children,
  className,
  showHeader = false,
  collapsible = false,
  defaultExpanded = true,
  variant = 'default',
}: {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  variant?: 'default' | 'card';
}) {
  const { hasActiveFilters, getActiveFilterCount, resetAllFilters } = useDataTableFilter();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasActiveFiltersValue = hasActiveFilters();
  const activeCount = getActiveFilterCount();

  // Default variant - simple filters without card wrapper
  if (variant === 'default') {
    return (
      <>
        {showHeader && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-4 w-4" />
              Filters
              {/* {hasActiveFiltersValue && <Badge type="primary">{activeCount}</Badge>} */}
            </div>
            {hasActiveFiltersValue && (
              <Button
                type="quaternary"
                theme="borderless"
                size="small"
                onClick={resetAllFilters}
                className="hover:bg-destructive hover:text-destructive-foreground h-8 px-2 text-xs">
                <RotateCcw className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>
        )}
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
          {Children.map(children, (child: ReactNode, index: number) => (
            <div key={index} className="flex-1 flex-shrink-0">
              {child}
            </div>
          ))}
        </div>
      </>
    );
  }

  // Card variant - wrapped in card with optional collapsible

  return (
    <Card className={cn('w-full', className)}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filters
              {/* {hasActiveFiltersValue && <Badge type="primary">{activeCount}</Badge>} */}
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFiltersValue && (
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  onClick={resetAllFilters}
                  className="h-7 px-2 text-xs">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset
                </Button>
              )}
              {collapsible && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="quaternary"
                      theme="borderless"
                      size="small"
                      className="h-7 w-7 p-0">
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

// Main component - no longer needs provider wrapper since unified context handles everything
function DataTableFilterBase({
  children,
  className,
  showHeader = false,
  collapsible = false,
  defaultExpanded = false,
}: Omit<DataTableFilterProps, 'table' | 'onFiltersChange' | 'defaultFilters'>) {
  return (
    <FilterBar
      className={className}
      showHeader={showHeader}
      collapsible={collapsible}
      defaultExpanded={defaultExpanded}>
      {children}
    </FilterBar>
  );
}

// Compound component structure
const DataTableFilter = Object.assign(DataTableFilterBase, {
  Search: SearchFilter,
  GlobalSearch: GlobalSearchFilter, // 🎯 New: Multi-column search
  DatePicker: DatePickerFilter,
  Select: SelectFilter,
  Radio: RadioPopoverFilter, // 🎯 Popover version by default
  Checkbox: CheckboxPopoverFilter, // 🎯 Popover version by default
  Tag: TagFilter, // 🎯 Inline multi-select with badges

  // Inline versions for when you want the old behavior
  RadioInline: RadioFilter,
  CheckboxInline: CheckboxFilter,
});

export { DataTableFilter };

// Export individual components for advanced usage
export {
  SearchFilter,
  GlobalSearchFilter,
  DatePickerFilter,
  SelectFilter,
  RadioFilter,
  CheckboxFilter,
  RadioPopoverFilter,
  CheckboxPopoverFilter,
  TagFilter,
};

// Export context and hooks
export { useDataTableFilter, useFilter } from '../../core/data-table.context';
export type { FilterState, FilterValue } from '../../core/data-table.context';
