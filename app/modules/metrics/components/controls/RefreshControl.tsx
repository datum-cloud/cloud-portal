'use client';

import { useMetrics } from '../../context';
import { parseDurationToMs } from '../../utils';
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
import { RefreshCw } from 'lucide-react';
import React from 'react';

/**
 * Control for manual refresh and automatic refresh interval.
 */
export function RefreshControl(): React.JSX.Element {
  const { refreshInterval, setRefreshInterval, refresh } = useMetrics();
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (refreshInterval === 'off') {
      setIsAutoRefreshing(false);
      return;
    }

    setIsAutoRefreshing(true);
    const interval = setInterval(
      () => {
        setIsAutoRefreshing(false);
        setTimeout(() => setIsAutoRefreshing(true), 100);
      },
      parseDurationToMs(refreshInterval) ?? 30000
    );

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const handleManualRefresh = (): void => {
    setIsManualRefreshing(true);
    refresh();
    setTimeout(() => setIsManualRefreshing(false), 1000);
  };

  const getTooltipText = (): string => {
    if (isManualRefreshing) {
      return 'Refreshing metrics...';
    }
    if (isAutoRefreshing && refreshInterval !== 'off') {
      return `Auto-refreshing every ${refreshInterval}`;
    }
    return 'Refresh metrics manually';
  };

  return (
    <div className="border-input bg-background flex items-center rounded-md border">
      {/* Manual Refresh Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-r-none border-r"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}>
              <RefreshCw
                className={`h-4 w-4 ${isManualRefreshing || isAutoRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Auto Refresh Interval Dropdown */}
      <Select value={refreshInterval} onValueChange={setRefreshInterval}>
        <SelectTrigger className="min-w-20 rounded-l-none border-0 focus:ring-0">
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
}
