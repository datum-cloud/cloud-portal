import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { REFRESH_OPTIONS } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context';
import { parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';

export interface RefreshControlProps {
  /**
   * URL parameter key for this refresh control.
   * Defaults to 'refresh' for backward compatibility.
   */
  filterKey?: string;
  /**
   * Default refresh interval value when no URL state exists.
   * Defaults to 'off'.
   */
  defaultValue?: string;
}

/**
 * Control for manual refresh and automatic refresh interval.
 * Supports URL state synchronization via filterKey prop.
 */
export const RefreshControl = ({
  filterKey = 'refresh',
  defaultValue = 'off',
}: RefreshControlProps) => {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();
  const queryClient = useQueryClient();

  // Register URL state for this control
  useEffect(() => {
    registerUrlState(filterKey, 'string', defaultValue);
  }, [registerUrlState, filterKey, defaultValue]);

  // Create URL state hook
  const [refreshInterval, setRefreshInterval] = useQueryState(
    filterKey,
    createMetricsParser('string', defaultValue)
  );

  // Update registry with actual URL state hooks (only when value changes)
  useEffect(() => {
    updateUrlStateEntry(filterKey, refreshInterval, setRefreshInterval);
  }, [updateUrlStateEntry, filterKey, refreshInterval]);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Auto refresh functionality
  useEffect(() => {
    const currentInterval = refreshInterval || defaultValue;
    if (currentInterval === 'off') {
      setIsAutoRefreshing(false);
      return;
    }

    setIsAutoRefreshing(true);
    const intervalMs = parseDurationToMs(currentInterval) ?? 30000;

    const interval = setInterval(() => {
      // Invalidate all prometheus queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['prometheus-api'] });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refreshInterval, defaultValue]);

  const handleManualRefresh = (): void => {
    setIsManualRefreshing(true);

    // Invalidate all prometheus queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['prometheus-api'] });

    setTimeout(() => setIsManualRefreshing(false), 1000);
  };

  const getTooltipText = (): string => {
    if (isManualRefreshing) {
      return 'Refreshing metrics...';
    }
    const currentInterval = refreshInterval || defaultValue;
    if (isAutoRefreshing && currentInterval !== 'off') {
      return `Auto-refreshing every ${currentInterval}`;
    }
    return 'Refresh metrics';
  };

  return (
    <div className="border-input bg-background flex h-[36px] items-center rounded-md border">
      {/* Manual Refresh Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="size-9 rounded-r-none border-r"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing || isAutoRefreshing}>
              <RefreshCw
                className={`size-4 ${isManualRefreshing || isAutoRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Auto Refresh Interval Dropdown */}
      <Select value={refreshInterval || defaultValue} onValueChange={setRefreshInterval}>
        <SelectTrigger className="min-w-10 rounded-l-none border-0 px-2 focus:ring-0">
          <SelectValue placeholder="Auto refresh" />
        </SelectTrigger>
        <SelectContent>
          {REFRESH_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
