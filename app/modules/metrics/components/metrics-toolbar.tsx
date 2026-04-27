/**
 * MetricsToolbar - Compound component for organizing core controls and filters
 */
import { RefreshControl } from '@/modules/metrics/components/controls/refresh-control';
import { StepControl } from '@/modules/metrics/components/controls/step-control';
// Import existing controls (will be updated to use new context)
import { TimeRangeControl } from '@/modules/metrics/components/controls/time-range-control';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { cn } from '@datum-cloud/datum-ui/utils';
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
    <div
      className={cn('flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center', className)}>
      <div className="w-full sm:w-auto">
        <TimeRangeControl />
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div className="min-w-0 flex-1 sm:flex-initial">
          <StepControl />
        </div>
        <div className="min-w-0 flex-1 sm:flex-initial">
          <RefreshControl />
        </div>
      </div>
    </div>
  );
}

// Filters wrapper component
function Filters({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  showResetButton?: boolean;
}) {
  return (
    <div className={cn('flex w-full items-center gap-2 sm:w-auto', className)}>
      <div className="flex w-full items-center gap-2 sm:w-auto">{children}</div>
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
    <div
      className={cn(
        'flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2',
        className
      )}>
      {content}
    </div>
  );
}

// Compound component structure
const MetricsToolbar = Object.assign(MetricsToolbarBase, {
  CoreControls,
  Filters,
});

export { MetricsToolbar };
