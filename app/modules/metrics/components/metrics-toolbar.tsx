/**
 * MetricsToolbar - Compound component for organizing core controls and filters
 */
import { RefreshControl } from '@/modules/metrics/components/controls/refresh-control';
import { StepControl } from '@/modules/metrics/components/controls/step-control';
// Import existing controls (will be updated to use new context)
import { TimeRangeControl } from '@/modules/metrics/components/controls/time-range-control';
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import { cn } from '@shadcn/lib/utils';
import { Card, CardContent } from '@shadcn/ui/card';
import { ReactNode } from 'react';

// Main toolbar props
export interface MetricsToolbarProps {
  children?: ReactNode;
  className?: string;
  variant?: 'default' | 'card';
}

// Core controls component
function CoreControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TimeRangeControl />
      <StepControl />
      <RefreshControl />
    </div>
  );
}

// Filters wrapper component
function Filters({
  children,
  className,
  showResetButton = true,
}: {
  children: ReactNode;
  className?: string;
  showResetButton?: boolean;
}) {
  const { hasActiveFilters, resetAllFilters, getActiveFilterCount } = useMetrics();

  const hasFilters = hasActiveFilters();
  const filterCount = getActiveFilterCount();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-2">{children}</div>
      {/* {showResetButton && hasFilters && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {filterCount} filter{filterCount !== 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAllFilters}
            className="hover:bg-destructive hover:text-destructive-foreground h-7 px-2 text-xs">
            <RotateCcw className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
      )} */}
    </div>
  );
}

// Main toolbar component
function MetricsToolbarBase({ children, className, variant = 'default' }: MetricsToolbarProps) {
  const content = children || <CoreControls />;

  if (variant === 'card') {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-between p-4">{content}</CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('flex w-full items-center justify-between gap-2', className)}>{content}</div>
  );
}

// Compound component structure
const MetricsToolbar = Object.assign(MetricsToolbarBase, {
  CoreControls,
  Filters,
});

export { MetricsToolbar };
