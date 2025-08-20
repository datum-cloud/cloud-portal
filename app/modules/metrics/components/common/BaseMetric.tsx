import { MetricLoaderWrapper } from './MetricLoaderWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type PrometheusError } from '@/modules/prometheus';
import React from 'react';

export interface BaseMetricProps {
  title?: string;
  description?: string;
  isLoading: boolean;
  isFetching: boolean;
  error: PrometheusError | null;
  children: React.ReactNode;
  className?: string;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  height?: number;
}

export function BaseMetric({
  title,
  description,
  isLoading,
  isFetching,
  error,
  children,
  className,
  isEmpty = false,
  emptyState,
  height,
}: BaseMetricProps) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <MetricLoaderWrapper
          isLoading={isLoading}
          isRefetching={isFetching && !isLoading}
          error={error}
          isEmpty={isEmpty}
          emptyState={emptyState}
          height={height}>
          {children}
        </MetricLoaderWrapper>
      </CardContent>
    </Card>
  );
}
