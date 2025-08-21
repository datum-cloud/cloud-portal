'use client';

import { useMetricsControl } from '../panel/hooks';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PRESET_RANGES } from '@/modules/metrics/constants';
import { getPresetDateRange } from '@/modules/metrics/utils';
import { cn } from '@/utils/common';
import { endOfDay, format, parseISO, startOfDay, subHours } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import React from 'react';
import type { DateRange } from 'react-day-picker';

/**
 * Time range control with preset options and custom date picker
 */
export function TimeRangeControl(): React.ReactElement {
  const { value: range, setValue: setRange } = useMetricsControl<string>('range');
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [pendingDate, setPendingDate] = React.useState<DateRange | undefined>(undefined);

  const currentRange = range || 'now-6h';

  const date: DateRange | undefined = React.useMemo<DateRange | undefined>(() => {
    if (currentRange.includes('_')) {
      const [startStr, endStr] = currentRange.split('_');
      const start = parseISO(startStr);
      const end = parseISO(endStr);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return { from: start, to: end };
      }
    }
    return undefined;
  }, [currentRange]);

  const handleDateSelect = (newDate: DateRange | undefined): void => {
    setPendingDate(newDate);
  };

  const handleApply = (): void => {
    if (pendingDate?.from && pendingDate?.to) {
      const start = startOfDay(pendingDate.from);
      const end = endOfDay(pendingDate.to);
      const rangeString = `${start.toISOString()}_${end.toISOString()}`;
      setRange(rangeString);
      setIsOpen(false);
      setPendingDate(undefined);
    }
  };

  const handleReset = (): void => {
    setPendingDate(date);
  };

  const handlePresetSelect = (preset: { value: string }): void => {
    setRange(preset.value);
    setIsOpen(false);
  };

  const isPreset: boolean = currentRange.startsWith('now-');

  const displayLabel: string = React.useMemo(() => {
    let dateRange: { from: Date; to: Date };

    if (isPreset) {
      dateRange = getPresetDateRange(currentRange);
    } else if (date?.from && date?.to) {
      dateRange = { from: date.from, to: date.to };
    } else {
      const currentPreset = PRESET_RANGES.find((p) => p.value === currentRange);
      if (currentPreset) {
        dateRange = getPresetDateRange(currentRange);
      } else {
        const now = new Date();
        dateRange = { from: subHours(now, 6), to: now };
      }
    }

    return `${format(dateRange.from, 'MMM dd, yyyy HH:mm')} - ${format(dateRange.to, 'MMM dd, yyyy HH:mm')}`;
  }, [currentRange, date, isPreset]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id="time-range"
          variant={'outline'}
          className={cn(
            'min-w-60 justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{displayLabel}</span>
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
                  variant={currentRange === preset.value ? 'default' : 'ghost'}
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
}
