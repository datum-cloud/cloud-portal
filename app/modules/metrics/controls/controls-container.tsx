import { useMetricsPanel } from '../panel/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/utils/common';
import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { ReactNode, useState, Children } from 'react';

export interface ControlsContainerProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  variant?: 'default' | 'card';
}

export function ControlsContainer({
  children,
  className,
  showHeader = false,
  collapsible = false,
  defaultExpanded = true,
  variant = 'default',
}: ControlsContainerProps) {
  const { hasActiveFilters, getActiveFilterCount, resetAllFilters } = useMetricsPanel();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasActiveFiltersValue = hasActiveFilters();
  const activeCount = getActiveFilterCount();

  // Default variant - simple controls without card wrapper
  if (variant === 'default') {
    return (
      <div className={cn('w-full', className)}>
        {showHeader && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Filter className="h-4 w-4" />
              Controls
              {hasActiveFiltersValue && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {activeCount}
                </span>
              )}
            </div>
            {hasActiveFiltersValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="hover:bg-destructive hover:text-destructive-foreground h-8 px-2 text-xs">
                <RotateCcw className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {Children.map(children, (child: ReactNode, index: number) => (
            <div key={index} className="flex-shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>
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
              Controls
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
                      <span className="sr-only">Toggle controls</span>
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
