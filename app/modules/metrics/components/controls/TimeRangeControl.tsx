'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRESET_RANGES } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context';
import { cn } from '@/utils/common';
import { endOfDay, format, parseISO, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import React from 'react';
import type { DateRange } from 'react-day-picker';

/**
 * Control to pick a time range using relative presets or absolute dates.
 */
export function TimeRangeControl(): React.ReactElement {
  const { range, setRange } = useMetrics();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const date: DateRange | undefined = React.useMemo<DateRange | undefined>(() => {
    if (range.includes('_')) {
      const [startStr, endStr] = range.split('_');
      const start = parseISO(startStr);
      const end = parseISO(endStr);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        return { from: start, to: end };
      }
    }
    return undefined;
  }, [range]);

  const handleDateSelect = (newDate: DateRange | undefined): void => {
    if (newDate?.from && newDate?.to) {
      const start = startOfDay(newDate.from);
      const end = endOfDay(newDate.to);
      const rangeString = `${start.toISOString()}_${end.toISOString()}`;
      setRange(rangeString);
      setIsOpen(false);
    }
  };

  const handlePresetSelect = (preset: { value: string }): void => {
    setRange(preset.value);
    setIsOpen(false);
  };

  const isPreset: boolean = range.startsWith('now-');
  const displayLabel: string = isPreset
    ? (PRESET_RANGES.find((p) => p.value === range)?.label ?? 'Custom')
    : `${format(date?.from ?? new Date(), 'LLL dd, y')} - ${format(date?.to ?? new Date(), 'LLL dd, y')}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={'outline'}
          className={cn(
            'w-[200px] justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Tabs defaultValue={isPreset ? 'presets' : 'custom'}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Relative</TabsTrigger>
            <TabsTrigger value="custom">Absolute</TabsTrigger>
          </TabsList>
          <TabsContent value="presets">
            <div className="grid grid-cols-2 gap-2 p-4">
              {PRESET_RANGES.map((preset) => (
                <Button
                  key={preset.value}
                  variant={range === preset.value ? 'default' : 'ghost'}
                  onClick={(): void => handlePresetSelect(preset)}>
                  {preset.label}
                </Button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="custom">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
