import { DateTime } from '@/components/date-time';
import { PRESET_RANGES } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import {
  getPresetDateRange,
  parseRange,
  serializeTimeRange,
} from '@/modules/metrics/utils/date-parsers';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { useApp } from '@/providers/app.provider';
import { toUTCTimestampStartOfDay, toUTCTimestampEndOfDay } from '@/utils/helpers/timezone.helper';
import { Button } from '@datum-ui/components';
import { Calendar } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { Calendar as CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

export interface TimeRangeControlProps {
  /**
   * URL parameter key for this time range control.
   * Defaults to 'timeRange' for backward compatibility.
   */
  filterKey?: string;
  /**
   * Default time range value when no URL state exists.
   * Defaults to 'now-24h'.
   */
  defaultValue?: string;
}

/**
 * Control to pick a time range using relative presets or absolute dates.
 * Supports URL state synchronization via filterKey prop.
 */
export const TimeRangeControl = ({
  filterKey = 'timeRange',
  defaultValue = 'now-24h',
}: TimeRangeControlProps) => {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();
  const { userPreferences } = useApp();

  // Get user's timezone with fallback to browser timezone
  const timezone = useMemo(() => {
    return userPreferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [userPreferences]);

  // Register URL state for this control
  useEffect(() => {
    registerUrlState(filterKey, 'string', defaultValue);
  }, [registerUrlState, filterKey, defaultValue]);

  // Create URL state hook
  const [urlValue, setUrlValue] = useQueryState(
    filterKey,
    createMetricsParser('string', defaultValue)
  );

  // Update registry with actual URL state hooks (only when value changes)
  useEffect(() => {
    updateUrlStateEntry(filterKey, urlValue, setUrlValue);
  }, [updateUrlStateEntry, filterKey, urlValue]);

  // Parse current time range from URL value
  const timeRange = useMemo(() => {
    return parseRange(urlValue || defaultValue);
  }, [urlValue, defaultValue]);

  const setTimeRange = useCallback(
    (newTimeRange: { start: Date; end: Date }) => {
      // Serialize as Unix timestamps (seconds)
      const rangeString = serializeTimeRange(newTimeRange);
      setUrlValue(rangeString);
    },
    [setUrlValue]
  );
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [pendingDate, setPendingDate] = useState<DateRange | undefined>(undefined);

  // Convert TimeRange to DateRange for the calendar
  const date: DateRange | undefined = useMemo<DateRange | undefined>(() => {
    return {
      from: timeRange.start,
      to: timeRange.end,
    };
  }, [timeRange]);

  const handleDateSelect = (newDate: DateRange | undefined): void => {
    // Store the pending date selection without applying it immediately
    setPendingDate(newDate);
  };

  const handleApply = (): void => {
    if (pendingDate?.from && pendingDate?.to) {
      // Convert to UTC timestamps using user's timezone
      const startTimestamp = toUTCTimestampStartOfDay(pendingDate.from, timezone);
      const endTimestamp = toUTCTimestampEndOfDay(pendingDate.to, timezone);

      // Create Date objects from UTC timestamps for internal representation
      const start = new Date(startTimestamp * 1000);
      const end = new Date(endTimestamp * 1000);

      setTimeRange({ start, end });
      setIsOpen(false);
      setPendingDate(undefined);
    }
  };

  const handleReset = (): void => {
    setPendingDate(date); // Reset to current applied date
  };

  const handlePresetSelect = (preset: { value: string }): void => {
    // Pass user's timezone to get timezone-aware preset ranges
    const presetRange = getPresetDateRange(preset.value, timezone);
    setTimeRange({ start: presetRange.from, end: presetRange.to });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          type="quaternary"
          theme="outline"
          className={cn(
            'h-[36px] justify-start px-3 text-left font-normal hover:bg-transparent',
            !date && 'text-muted-foreground'
          )}>
          <CalendarIcon className="mr-1 size-4" />
          <div className="flex items-center gap-1">
            <DateTime
              date={timeRange.start}
              format="MMM d, yyyy hh:mmaaa"
              showTooltip={false}
              disableTimezone
            />
            <span className="text-muted-foreground">-</span>
            <DateTime
              date={timeRange.end}
              format="MMM d, yyyy hh:mmaaa"
              showTooltip={false}
              disableTimezone
            />
          </div>
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets Section */}
          <div className="border-border border-r p-4 pr-6">
            <div className="mb-3">
              <h4 className="text-sm font-medium">Quick Ranges</h4>
            </div>
            <div className="grid min-w-[120px] grid-cols-1 gap-2">
              {PRESET_RANGES.map((preset) => (
                <Button
                  key={preset.value}
                  size="small"
                  type="quaternary"
                  theme="borderless"
                  className="justify-start"
                  onClick={(): void => handlePresetSelect(preset)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar Section */}
          <div className="p-4">
            <div className="mb-3">
              <h4 className="text-sm font-medium">Custom Range</h4>
            </div>
            <Calendar
              animate
              mode="range"
              defaultMonth={date?.from}
              selected={pendingDate || date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              className="rounded-md border-0"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button size="small" type="quaternary" theme="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button
                size="small"
                onClick={handleApply}
                disabled={!pendingDate?.from || !pendingDate?.to}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
