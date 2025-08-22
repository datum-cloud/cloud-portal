/**
 * MetricsToolbar - Compound component for organizing core controls and filters
 */
import { useMetrics } from '../context/metrics.context';
import { RefreshControl } from './controls/RefreshControl';
import { StepControl } from './controls/StepControl';
// Import existing controls (will be updated to use new context)
import { TimeRangeControl } from './controls/TimeRangeControl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/common';
import { RotateCcw } from 'lucide-react';
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
      {showResetButton && hasFilters && (
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
      )}
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
