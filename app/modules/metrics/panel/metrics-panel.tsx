'use client';

import { MetricCard } from '../charts/metric-card';
import { MetricChart } from '../charts/metric-chart';
import { ControlsContainer, ControlsContainerProps } from '../controls/controls-container';
import { RefreshControl } from '../controls/refresh-control';
import { StepControl } from '../controls/step-control';
import { TimeRangeControl } from '../controls/time-range-control';
import { MetricsPanelProvider, MetricsPanelProviderProps } from './metrics-panel-provider';
import React, { ReactNode } from 'react';

// Main MetricsPanel component props
export interface MetricsPanelProps extends Omit<MetricsPanelProviderProps, 'children'> {
  children: ReactNode;
}

// Controls component props
interface ControlsProps extends Omit<ControlsContainerProps, 'children'> {
  children?: ReactNode;
}

/**
 * Main MetricsPanel component that provides context and renders children
 */
function MetricsPanelBase({ children, ...providerProps }: MetricsPanelProps) {
  return <MetricsPanelProvider {...providerProps}>{children}</MetricsPanelProvider>;
}

/**
 * Controls container component
 */
function Controls({ children, ...containerProps }: ControlsProps) {
  // If no children provided, render default controls
  if (!children) {
    return (
      <ControlsContainer {...containerProps}>
        <TimeRangeControl />
        <StepControl />
        <RefreshControl />
      </ControlsContainer>
    );
  }

  return <ControlsContainer {...containerProps}>{children}</ControlsContainer>;
}

/**
 * Grid layout helper for organizing charts
 */
interface GridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: 2 | 4 | 6 | 8;
  className?: string;
}

function Grid({ children, cols = 2, gap = 4, className }: GridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gridGap = {
    2: 'gap-2',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div className={`grid ${gridCols[cols]} ${gridGap[gap]} ${className || ''}`}>{children}</div>
  );
}

/**
 * Section helper for organizing content
 */
interface SectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

function Section({ children, title, description, className }: SectionProps) {
  return (
    <div className={`space-y-4 ${className || ''}`}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

// Create compound component with all sub-components
export const MetricsPanel = Object.assign(MetricsPanelBase, {
  // Controls
  Controls,
  TimeRange: TimeRangeControl,
  Step: StepControl,
  Refresh: RefreshControl,

  // Charts
  Chart: MetricChart,
  Card: MetricCard,

  // Layout helpers
  Grid,
  Section,
});
