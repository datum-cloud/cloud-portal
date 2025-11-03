import { type PrometheusError } from '@/modules/prometheus';
import { Alert, AlertDescription } from '@datum-ui/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shadcn/ui/card';
import { AlertCircle, Loader2, Minus } from 'lucide-react';
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
}: BaseMetricProps): React.ReactElement {
  const containerStyle = height ? { minHeight: height } : {};

  const DefaultEmptyState = (
    <div className="text-center">
      <Minus className="mx-auto mb-2 h-8 w-8" />
      <p>No data available</p>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <div
          className="flex w-full items-center justify-center text-gray-400"
          style={containerStyle}>
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full p-4" style={containerStyle}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {(error as Error).message || 'Failed to load metric.'}
            </AlertDescription>
          </Alert>
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
      <div className="relative" style={containerStyle}>
        {isFetching && !isLoading && (
          <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        )}
        {children}
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
      <CardContent className="px-0">{renderContent()}</CardContent>
    </Card>
  );
}
