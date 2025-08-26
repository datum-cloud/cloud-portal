import { useMetrics } from '../../context/metrics.context';
import { createMetricsParser } from '../../utils/url-parsers';
import { DateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PRESET_RANGES } from '@/modules/metrics/constants';
import { getPresetDateRange, parseRange } from '@/modules/metrics/utils/date-parsers';
import { cn } from '@/utils/common';
import { endOfDay, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
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
      const rangeString = `${newTimeRange.start.toISOString()}_${newTimeRange.end.toISOString()}`;
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
      const start = startOfDay(pendingDate.from);
      const end = endOfDay(pendingDate.to);
      setTimeRange({ start, end });
      setIsOpen(false);
      setPendingDate(undefined);
    }
  };

  const handleReset = (): void => {
    setPendingDate(date); // Reset to current applied date
  };

  const handlePresetSelect = (preset: { value: string }): void => {
    const presetRange = getPresetDateRange(preset.value);
    setTimeRange({ start: presetRange.from, end: presetRange.to });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={'outline'}
          className={cn(
            'h-[36px] min-w-60 justify-start px-3 text-left font-normal',
            !date && 'text-muted-foreground'
          )}>
          <CalendarIcon className="mr-1 size-4" />
          <div className="flex items-center gap-1">
            <DateFormat date={timeRange.start} />
            <span className="text-muted-foreground">-</span>
            <DateFormat date={timeRange.end} />
          </div>
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
                  size="sm"
                  variant="ghost"
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
              <Button size="sm" variant="outline" onClick={handleReset}>
                Reset
              </Button>
              <Button
                size="sm"
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
