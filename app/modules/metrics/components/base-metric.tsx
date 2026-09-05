import { formatMetricError } from '@/modules/metrics/utils/format-metric-error';
import { type PrometheusError } from '@/modules/prometheus';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import React from 'react';

// Deterministic heights so the skeleton doesn't shift on re-render
const SKELETON_HEIGHTS = [
  35, 60, 45, 80, 30, 55, 70, 40, 65, 50, 75, 35, 55, 45, 70, 60, 30, 80, 50, 65, 40, 55, 70, 35,
];

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
  footer?: React.ReactNode;
}

/**
 * BaseMetric wraps metric content in a Card and handles loading, error, empty, and refetch overlay states.
 */
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
  footer,
}: BaseMetricProps): React.ReactElement {
  const containerStyle = height ? { height } : {};

  const DefaultEmptyState = (
    <p className="text-muted-foreground text-sm">No data recorded in this period.</p>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="w-full px-14 pt-2 pb-8" style={containerStyle}>
          <div className="flex h-full items-end gap-1">
            {SKELETON_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="bg-muted animate-pulse rounded-sm"
                style={{ flex: 1, height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div
          className="text-muted-foreground flex w-full items-center justify-center p-4 text-center text-sm"
          style={containerStyle}>
          {formatMetricError(error)}
        </div>
      );
    }

    if (isEmpty) {
      return (
        <div
          className="text-muted-foreground flex w-full items-center justify-center"
          style={containerStyle}>
          {emptyState || DefaultEmptyState}
        </div>
      );
    }

    return (
      <div>
        <div className="relative overflow-visible" style={containerStyle}>
          {isFetching && !isLoading && (
            <div className="bg-background/50 absolute inset-0 rounded-lg" />
          )}
          {children}
        </div>
        {footer}
      </div>
    );
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="px-3 py-2">{renderContent()}</CardContent>
    </Card>
  );
}
