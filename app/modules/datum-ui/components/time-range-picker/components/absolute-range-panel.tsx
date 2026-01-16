// app/modules/datum-ui/components/time-range-picker/components/absolute-range-panel.tsx
import { utcStringToZonedDate, zonedDateToUtcString } from '../utils/timezone';
import { Button } from '@datum-ui/components';
import { Calendar } from '@datum-ui/components';
import { Input } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState, useEffect, useCallback, useId, useRef } from 'react';

interface CustomRangePanelProps {
  /** Start time in UTC ISO format */
  fromUtc: string;
  /** End time in UTC ISO format */
  toUtc: string;
  /** User's timezone for display */
  timezone: string;
  /** Called when range changes (with UTC values) */
  onRangeChange: (from: string, to: string) => void;
  /** Disable future dates */
  disableFuture?: boolean;
  /** Debounce delay for time inputs in ms */
  debounceMs?: number;
  className?: string;
}

/**
 * Parse a zoned date into separate date and time parts
 */
function parseDateTimeParts(zonedDate: Date): { date: Date; time: string } {
  const hours = zonedDate.getHours().toString().padStart(2, '0');
  const minutes = zonedDate.getMinutes().toString().padStart(2, '0');
  return {
    date: zonedDate,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Combine a date and time string into a single Date
 */
function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return combined;
}

/**
 * Validate time string format (HH:mm)
 */
function isValidTime(time: string): boolean {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function CustomRangePanel({
  fromUtc,
  toUtc,
  timezone,
  onRangeChange,
  disableFuture = false,
  debounceMs = 600,
  className,
}: CustomRangePanelProps) {
  const startDateId = useId();
  const startTimeId = useId();
  const endDateId = useId();
  const endTimeId = useId();

  // Track if user has manually edited the time inputs
  const userHasEditedTimeRef = useRef(false);

  // Track previous prop values to detect external changes
  const prevFromUtcRef = useRef(fromUtc);
  const prevToUtcRef = useRef(toUtc);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Popover open states
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Parse initial values
  const initialFrom = parseDateTimeParts(utcStringToZonedDate(fromUtc, timezone));
  const initialTo = parseDateTimeParts(utcStringToZonedDate(toUtc, timezone));

  // Local state for date and time (in user's timezone)
  const [startDate, setStartDate] = useState<Date>(initialFrom.date);
  const [startTime, setStartTime] = useState<string>(initialFrom.time);
  const [endDate, setEndDate] = useState<Date>(initialTo.date);
  const [endTime, setEndTime] = useState<string>(initialTo.time);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Update local state when UTC props change (from external source like preset selection)
  useEffect(() => {
    const fromChanged = fromUtc !== prevFromUtcRef.current;
    const toChanged = toUtc !== prevToUtcRef.current;

    if (fromChanged) {
      try {
        const parsed = parseDateTimeParts(utcStringToZonedDate(fromUtc, timezone));
        setStartDate(parsed.date);
        setStartTime(parsed.time);
        userHasEditedTimeRef.current = false;
      } catch {
        // Ignore invalid dates
      }
      prevFromUtcRef.current = fromUtc;
    }

    if (toChanged) {
      try {
        const parsed = parseDateTimeParts(utcStringToZonedDate(toUtc, timezone));
        setEndDate(parsed.date);
        setEndTime(parsed.time);
        userHasEditedTimeRef.current = false;
      } catch {
        // Ignore invalid dates
      }
      prevToUtcRef.current = toUtc;
    }
  }, [fromUtc, toUtc, timezone]);

  // Notify parent when values change (immediate, no debounce)
  const notifyChangeImmediate = useCallback(
    (newStartDate: Date, newStartTime: string, newEndDate: Date, newEndTime: string) => {
      if (!isValidTime(newStartTime) || !isValidTime(newEndTime)) return;

      const startCombined = combineDateAndTime(newStartDate, newStartTime);
      const endCombined = combineDateAndTime(newEndDate, newEndTime);

      // Validate: start must be before end
      if (startCombined >= endCombined) return;

      const newFromUtc = zonedDateToUtcString(startCombined, timezone);
      const newToUtc = zonedDateToUtcString(endCombined, timezone);

      // Only call if actually changed
      if (newFromUtc !== fromUtc || newToUtc !== toUtc) {
        onRangeChange(newFromUtc, newToUtc);
      }
    },
    [timezone, fromUtc, toUtc, onRangeChange]
  );

  // Notify parent when values change (debounced for time inputs)
  const notifyChangeDebounced = useCallback(
    (newStartDate: Date, newStartTime: string, newEndDate: Date, newEndTime: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced timer
      debounceTimerRef.current = setTimeout(() => {
        notifyChangeImmediate(newStartDate, newStartTime, newEndDate, newEndTime);
      }, debounceMs);
    },
    [notifyChangeImmediate, debounceMs]
  );

  // Handlers for start date (immediate)
  const handleStartDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      setStartDate(date);
      setStartDateOpen(false);
      notifyChangeImmediate(date, startTime, endDate, endTime);
    },
    [startTime, endDate, endTime, notifyChangeImmediate]
  );

  // Handlers for start time (debounced)
  const handleStartTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      userHasEditedTimeRef.current = true;
      setStartTime(newTime);
      if (isValidTime(newTime)) {
        notifyChangeDebounced(startDate, newTime, endDate, endTime);
      }
    },
    [startDate, endDate, endTime, notifyChangeDebounced]
  );

  // Handlers for end date (immediate)
  const handleEndDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      setEndDate(date);
      setEndDateOpen(false);
      notifyChangeImmediate(startDate, startTime, date, endTime);
    },
    [startDate, startTime, endTime, notifyChangeImmediate]
  );

  // Handlers for end time (debounced)
  const handleEndTimeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = e.target.value;
      userHasEditedTimeRef.current = true;
      setEndTime(newTime);
      if (isValidTime(newTime)) {
        notifyChangeDebounced(startDate, startTime, endDate, newTime);
      }
    },
    [startDate, startTime, endDate, notifyChangeDebounced]
  );

  // Effective max date for calendar
  // const effectiveMaxDate = disableFuture ? new Date() : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <p className="text-muted-foreground text-xs font-medium">Custom Range</p>

      {/* Inline layout: Start — End */}
      <div className="flex items-center gap-2">
        {/* Start Date + Time */}
        <div className="flex items-center gap-1.5">
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="quaternary"
                theme="outline"
                id={startDateId}
                className="h-8 w-full justify-start gap-1.5 px-2 text-xs font-normal">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="truncate">{format(startDate, 'MMM d, yyyy')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateSelect}
                disabled={disableFuture ? (date) => date > new Date() : undefined}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Input
            type="time"
            id={startTimeId}
            value={startTime}
            onChange={handleStartTimeChange}
            className={cn(
              'h-8 w-[80px] px-2 text-xs md:text-xs',
              'appearance-none bg-transparent',
              '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
            )}
          />
        </div>

        {/* Separator */}
        <span className="text-muted-foreground text-sm">—</span>

        {/* End Date + Time */}
        <div className="flex items-center gap-1.5">
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                type="quaternary"
                theme="outline"
                id={endDateId}
                className="h-8 w-full justify-start gap-1.5 px-2 text-xs font-normal">
                <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                <span className="truncate">{format(endDate, 'MMM d, yyyy')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateSelect}
                disabled={
                  disableFuture
                    ? (date) => date > new Date() || date < startDate
                    : (date) => date < startDate
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Input
            type="time"
            id={endTimeId}
            value={endTime}
            onChange={handleEndTimeChange}
            className={cn(
              'h-8 w-[80px] px-2 text-xs md:text-xs',
              'appearance-none bg-transparent',
              '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
            )}
          />
        </div>
      </div>
    </div>
  );
}

// Keep the old name for backward compatibility during refactor
export { CustomRangePanel as AbsoluteRangePanel };
