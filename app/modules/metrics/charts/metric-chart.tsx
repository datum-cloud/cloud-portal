'use client';

import { useMetricsPanel } from '../panel/hooks';
import type { MetricsFilterState } from '../panel/metrics-panel-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrometheusChart } from '@/modules/metrics/hooks';
import type { TimeRange } from '@/modules/prometheus';
import type { ChartType } from '@/modules/prometheus/types';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';

// We'll use a simple chart placeholder for now
// In a real implementation, you would import your actual chart components

export interface MetricChartProps {
  // Query - can be string or function that receives current filter state
  query: string | ((filters: MetricsFilterState) => string);

  // Chart configuration
  title: string;
  description?: string;
  chartType?: ChartType;
  height?: number;

  // Manual overrides (for backward compatibility or special cases)
  timeRange?: TimeRange;
  step?: string;

  // Auto-integration control
  autoIntegration?: boolean;

  // Styling
  className?: string;

  // Callbacks
  onDataChange?: (rawData: any, chartData: any) => void;
  onSeriesChange?: (series: any[]) => void;
  onQueryStateChange?: (state: { isLoading: boolean; isFetching: boolean; error: any }) => void;
}

/**
 * Auto-integrated metric chart that automatically uses MetricsPanel filter state
 */
export function MetricChart({
  query,
  title,
  description,
  chartType = 'line',
  height = 300,
  timeRange: manualTimeRange,
  step: manualStep,
  autoIntegration = true,
  className,
  onDataChange,
  onSeriesChange,
  onQueryStateChange,
}: MetricChartProps): React.ReactElement {
  const context = useMetricsPanel();

  // Determine final query string
  const finalQuery = useMemo(() => {
    if (typeof query === 'function') {
      return query(context.filterState);
    }
    return query;
  }, [query, context.filterState]);

  // Determine final timeRange and step
  const finalTimeRange =
    manualTimeRange || (autoIntegration ? context.timeRange : context.timeRange);
  const finalStep = manualStep || (autoIntegration ? context.step : context.step);

  // Fetch chart data
  const { data, isLoading, error, isFetching } = usePrometheusChart({
    query: finalQuery,
    timeRange: finalTimeRange,
    step: finalStep,
  });

  // Handle callbacks
  React.useEffect(() => {
    if (data) {
      onDataChange?.(data, data);
    }
  }, [data, onDataChange]);

  React.useEffect(() => {
    if (data) {
      const series = [
        {
          name: title,
          color: `hsl(210, 70%, 50%)`,
        },
      ];
      onSeriesChange?.(series);
    }
  }, [data, onSeriesChange, title]);

  React.useEffect(() => {
    onQueryStateChange?.({ isLoading, isFetching, error });
  }, [isLoading, isFetching, error, onQueryStateChange]);

  // Render chart placeholder - replace with actual chart implementation
  const renderChart = () => {
    if (!data?.chartData) return null;

    return (
      <div
        className="border-muted-foreground/25 bg-muted/10 flex items-center justify-center rounded-lg border-2 border-dashed"
        style={{ height }}>
        <div className="text-muted-foreground text-center">
          <div className="text-sm font-medium">{chartType.toUpperCase()} Chart</div>
          <div className="text-xs">Chart implementation goes here</div>
          <div className="mt-1 text-xs">Query: {finalQuery}</div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading chart data...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Error loading chart: {error.message}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="relative">
            {isFetching && (
              <div className="absolute top-2 right-2 z-10">
                <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
              </div>
            )}
            {renderChart()}
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="flex items-center justify-center" style={{ height }}>
            <span className="text-muted-foreground">No data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
