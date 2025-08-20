/**
 * Wrapper component to handle loading and error states for metric components.
 */
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Minus } from 'lucide-react';
import React from 'react';

interface MetricLoaderWrapperProps {
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  isEmpty?: boolean;
  emptyState?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
}

const DefaultEmptyState = () => (
  <div className="text-center">
    <Minus className="mx-auto mb-2 h-8 w-8" />
    <p>No data available</p>
  </div>
);

export function MetricLoaderWrapper({
  isLoading,
  isRefetching,
  error,
  isEmpty = false,
  emptyState,
  children,
  height,
}: MetricLoaderWrapperProps) {
  const containerStyle = height ? { minHeight: height } : {};

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center text-gray-400" style={containerStyle}>
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
            {error.message || 'Failed to load metric.'}
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
        {emptyState || <DefaultEmptyState />}
      </div>
    );
  }

  return (
    <div className="relative" style={containerStyle}>
      {isRefetching && (
        <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}
      {children}
    </div>
  );
}
