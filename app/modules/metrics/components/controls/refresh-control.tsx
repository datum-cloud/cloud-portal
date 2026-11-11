import { METRICS_CONTROL_HEIGHT_CLASS, REFRESH_OPTIONS } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context';
import { parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { Button } from '@datum-cloud/datum-ui/button';
import { ButtonGroup } from '@datum-cloud/datum-ui/button-group';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
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
      void queryClient.invalidateQueries({ queryKey: ['prometheus-api'] });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refreshInterval, defaultValue]);

  const handleManualRefresh = (): void => {
    setIsManualRefreshing(true);

    // Invalidate all prometheus queries to trigger refetch
    void queryClient.invalidateQueries({ queryKey: ['prometheus-api'] });

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

  const currentRefresh = refreshInterval || defaultValue;
  const refreshLabel =
    REFRESH_OPTIONS.find((option) => option.value === currentRefresh)?.label ?? currentRefresh;

  return (
    <ButtonGroup className={cn('w-full sm:w-fit', METRICS_CONTROL_HEIGHT_CLASS)}>
      {/* Manual Refresh Button: field border and colours so it reads as part of the control.
          Tooltip wraps it in a span, so ButtonGroup cannot square its corners. */}
      <Tooltip message={getTooltipText()}>
        <Button
          type="quaternary"
          theme="outline"
          size="icon"
          aria-label="Refresh metrics"
          className="border-input-border bg-card text-muted-foreground dark:border-input-border dark:text-muted-foreground h-auto w-9 shrink-0 rounded-r-none"
          onClick={handleManualRefresh}
          disabled={isManualRefreshing || isAutoRefreshing}>
          <Icon
            icon={RefreshCw}
            className={cn('size-4', (isManualRefreshing || isAutoRefreshing) && 'animate-spin')}
          />
        </Button>
      </Tooltip>

      {/* Auto Refresh Interval Dropdown */}
      <Select value={refreshInterval || defaultValue} onValueChange={setRefreshInterval}>
        <SelectTrigger
          aria-label="Auto refresh"
          className={cn('bg-card flex-1 sm:w-auto sm:flex-initial', METRICS_CONTROL_HEIGHT_CLASS)}>
          {/* Explicit label so the server render shows it too; Radix fills SelectValue only on the client. */}
          <SelectValue placeholder="Auto refresh">{refreshLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {REFRESH_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ButtonGroup>
  );
};
