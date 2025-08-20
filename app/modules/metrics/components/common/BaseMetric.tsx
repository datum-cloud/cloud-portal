import { MetricLoaderWrapper } from './MetricLoaderWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type PrometheusError } from '@/modules/prometheus';
import React from 'react';

export interface BaseMetricProps {
  title?: string;
  description?: string;
  isLoading: boolean;
  error: PrometheusError | null;
  children: React.ReactNode;
  className?: string;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
}

export function BaseMetric({
  title,
  description,
  isLoading,
  error,
  children,
  className,
  isEmpty = false,
  emptyState,
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
          error={error}
          isEmpty={isEmpty}
          emptyState={emptyState}>
          {children}
        </MetricLoaderWrapper>
      </CardContent>
    </Card>
  );
}
