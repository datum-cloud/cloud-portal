'use client';

import { useMetricsControl } from '../panel/hooks';
import { useMetricsPanel } from '../panel/hooks';
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
import { parseDurationToMs } from '@/modules/metrics/utils';
import { RefreshCw } from 'lucide-react';
import React from 'react';

/**
 * Refresh control for manual refresh and auto-refresh intervals
 */
export function RefreshControl(): React.JSX.Element {
  const { value: refreshInterval, setValue: setRefreshInterval } =
    useMetricsControl<string>('refreshInterval');
  const { refresh } = useMetricsPanel();
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = React.useState(false);

  const currentRefreshInterval = refreshInterval || 'off';

  React.useEffect(() => {
    if (currentRefreshInterval === 'off') {
      setIsAutoRefreshing(false);
      return;
    }

    setIsAutoRefreshing(true);
    const interval = setInterval(
      () => {
        setIsAutoRefreshing(false);
        refresh();
        setTimeout(() => setIsAutoRefreshing(true), 100);
      },
      parseDurationToMs(currentRefreshInterval) ?? 30000
    );

    return () => clearInterval(interval);
  }, [currentRefreshInterval, refresh]);

  const handleManualRefresh = (): void => {
    setIsManualRefreshing(true);
    refresh();
    setTimeout(() => setIsManualRefreshing(false), 1000);
  };

  const getTooltipText = (): string => {
    if (isManualRefreshing) {
      return 'Refreshing metrics...';
    }
    if (isAutoRefreshing && currentRefreshInterval !== 'off') {
      return `Auto-refreshing every ${currentRefreshInterval}`;
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
      <Select value={currentRefreshInterval} onValueChange={setRefreshInterval}>
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
