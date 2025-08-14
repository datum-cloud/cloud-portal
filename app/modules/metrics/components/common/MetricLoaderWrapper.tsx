/**
 * Wrapper component to handle loading and error states for metric components.
 */
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/common';
import { AlertCircle } from 'lucide-react';
import React from 'react';

interface MetricLoaderWrapperProps {
  /**
   * Is the data currently loading?
   */
  isLoading: boolean;

  /**
   * An error object if the query failed.
   */
  error: Error | null;

  /**
   * The title of the metric component, used for context in error messages.
   */
  title?: string;

  /**
   * The content to render when data has loaded successfully.
   */
  children: React.ReactNode;

  /**
   * Optional class name for the container card.
   */
  className?: string;
}

export function MetricLoaderWrapper({
  isLoading,
  error,
  title,
  children,
  className,
}: MetricLoaderWrapperProps) {
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-sm font-medium">{title}</CardTitle>}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-sm font-medium">{title}</CardTitle>}
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {error.message || 'Failed to load metric.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
