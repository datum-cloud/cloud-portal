'use client';

import { useMetricsPanel } from '../panel/hooks';
import type { MetricsFilterState } from '../panel/metrics-panel-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrometheusCard } from '@/modules/metrics/hooks';
import type { TimeRange } from '@/modules/prometheus';
import type { MetricFormat } from '@/modules/prometheus/types';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';

export interface MetricCardProps {
  // Query - can be string or function that receives current filter state
  query: string | ((filters: MetricsFilterState) => string);

  // Card configuration
  title: string;
  description?: string;
  metricFormat?: MetricFormat;

  // Manual overrides (for backward compatibility or special cases)
  timeRange?: TimeRange;
  step?: string;

  // Auto-integration control
  autoIntegration?: boolean;

  // Styling
  className?: string;

  // Callbacks
  onDataChange?: (data: any) => void;
  onQueryStateChange?: (state: { isLoading: boolean; isFetching: boolean; error: any }) => void;
}

/**
 * Auto-integrated metric card that automatically uses MetricsPanel filter state
 */
export function MetricCard({
  query,
  title,
  description,
  metricFormat = 'number',
  timeRange: manualTimeRange,
  step: manualStep,
  autoIntegration = true,
  className,
  onDataChange,
  onQueryStateChange,
}: MetricCardProps): React.ReactElement {
  const context = useMetricsPanel();

  // Determine final query string
  const finalQuery = useMemo(() => {
    if (typeof query === 'function') {
      return query(context.filterState);
    }
    return query;
  }, [query, context.filterState]);

  // Determine final timeRange and step (for instant queries, timeRange might not be needed)
  const finalTimeRange =
    manualTimeRange || (autoIntegration ? context.timeRange : context.timeRange);
  const finalStep = manualStep || (autoIntegration ? context.step : context.step);

  // Fetch card data
  const { data, isLoading, error, isFetching } = usePrometheusCard({
    query: finalQuery,
    metricFormat,
    // For instant queries, we might not need timeRange, but keeping it for consistency
    timeRange: finalTimeRange,
  });

  // Handle callbacks
  React.useEffect(() => {
    if (data) {
      onDataChange?.(data);
    }
  }, [data, onDataChange]);

  React.useEffect(() => {
    onQueryStateChange?.({ isLoading, isFetching, error });
  }, [isLoading, isFetching, error, onQueryStateChange]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
          </div>
          {isFetching && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {error.message}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && data && (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{data.value || '—'}</div>
            {/* Unit display - adjust based on your MetricCardData type */}
            <div className="text-muted-foreground text-sm">{metricFormat}</div>
          </div>
        )}

        {!isLoading && !error && !data && (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">No data available</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
