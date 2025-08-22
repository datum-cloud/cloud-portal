import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/common';
import { cva, VariantProps } from 'class-variance-authority';
import {
  startOfWeek,
  endOfWeek,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import { CalendarIcon, X } from 'lucide-react';
import * as React from 'react';
import { DateRange } from 'react-day-picker';

// src/components/calendar-date-picker.tsx

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const multiSelectVariants = cva(
  'flex font-normal shadow-none items-center justify-center whitespace-nowrap rounded-md text-sm text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground text-background',
        link: 'text-primary underline-offset-4 hover:underline text-background',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface DateRangePreset {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

interface CalendarDatePickerProps
  extends React.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
  id?: string;
  className?: string;
  date: DateRange;
  closeOnSelect?: boolean;
  numberOfMonths?: 1 | 2;
  yearsRange?: number;
  onDateSelect: (range: { from: Date; to: Date } | undefined) => void;
  placeholder?: string;
  excludePresets?: string[];
  customPresets?: DateRangePreset[]; // Custom presets to use instead of default ones
  // Date range constraints
  minDate?: Date;
  maxDate?: Date;
  disableFuture?: boolean;
  disablePast?: boolean;
  maxRange?: number; // Maximum number of days between start and end date
}

export const CalendarDatePicker = React.forwardRef<HTMLButtonElement, CalendarDatePickerProps>(
  (
    {
      id = 'calendar-date-picker',
      className,
      date,
      closeOnSelect = false,
      numberOfMonths = 2,
      yearsRange = 10,
      onDateSelect,
      variant,
      placeholder,
      excludePresets,
      customPresets,
      minDate,
      maxDate,
      disableFuture = false,
      disablePast = false,
      maxRange,
      ...props
    },
    ref
  ) => {
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [selectedRange, setSelectedRange] = React.useState<string | null>(
      numberOfMonths === 2 ? 'This Year' : 'Today'
    );
    const [monthFrom, setMonthFrom] = React.useState<Date | undefined>(date?.from);
    const [yearFrom, setYearFrom] = React.useState<number | undefined>(date?.from?.getFullYear());
    const [monthTo, setMonthTo] = React.useState<Date | undefined>(
      numberOfMonths === 2 ? date?.to : date?.from
    );
    const [yearTo, setYearTo] = React.useState<number | undefined>(
      numberOfMonths === 2 ? date?.to?.getFullYear() : date?.from?.getFullYear()
    );
    const [highlightedPart, setHighlightedPart] = React.useState<string | null>(null);

    // Temporary state for pending changes (until Apply is clicked)
    const [pendingDate, setPendingDate] = React.useState<DateRange>(date);

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = new Date();

    // Calculate date constraints
    const effectiveMinDate = React.useMemo(() => {
      let min = minDate;
      if (disablePast) {
        const todayStart = startOfDay(today);
        min = min ? (min > todayStart ? min : todayStart) : todayStart;
      }
      return min;
    }, [minDate, disablePast, today]);

    const effectiveMaxDate = React.useMemo(() => {
      let max = maxDate;
      if (disableFuture) {
        const todayEnd = endOfDay(today);
        max = max ? (max < todayEnd ? max : todayEnd) : todayEnd;
      }
      return max;
    }, [maxDate, disableFuture, today]);

    // Validate if a date is selectable
    const isDateDisabled = React.useCallback(
      (date: Date) => {
        if (effectiveMinDate && date < effectiveMinDate) return true;
        if (effectiveMaxDate && date > effectiveMaxDate) return true;
        return false;
      },
      [effectiveMinDate, effectiveMaxDate]
    );

    // Calculate the number of days between two dates
    const getDaysDifference = React.useCallback((from: Date, to: Date): number => {
      const timeDiff = Math.abs(to.getTime() - from.getTime());
      return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }, []);

    // Validate if a date range exceeds the maximum allowed range
    const isRangeValid = React.useCallback(
      (from: Date, to: Date): boolean => {
        if (!maxRange) return true;
        if (numberOfMonths === 1) return true; // Single date picker always valid
        return getDaysDifference(from, to) <= maxRange;
      },
      [maxRange, numberOfMonths, getDaysDifference]
    );

    // Auto-adjust date range to fit within maxRange
    const adjustRangeToMaxRange = React.useCallback(
      (from: Date, to: Date): { from: Date; to: Date } => {
        if (!maxRange || numberOfMonths === 1) return { from, to };

        const daysDiff = getDaysDifference(from, to);
        if (daysDiff <= maxRange) return { from, to };

        // Adjust the 'to' date to be within maxRange from 'from' date
        const adjustedTo = new Date(from.getTime() + maxRange * 24 * 60 * 60 * 1000);

        // Make sure the adjusted date doesn't exceed effectiveMaxDate
        if (effectiveMaxDate && adjustedTo > effectiveMaxDate) {
          // If adjusting 'to' would exceed maxDate, try adjusting 'from' instead
          const adjustedFrom = new Date(to.getTime() - maxRange * 24 * 60 * 60 * 1000);

          // Make sure the adjusted 'from' doesn't go below effectiveMinDate
          if (effectiveMinDate && adjustedFrom < effectiveMinDate) {
            // If both adjustments fail, keep original dates (validation will catch this)
            return { from, to };
          }

          return { from: adjustedFrom, to };
        }

        return { from, to: adjustedTo };
      },
      [maxRange, numberOfMonths, getDaysDifference, effectiveMinDate, effectiveMaxDate]
    );

    // Sync pendingDate with date prop changes
    React.useEffect(() => {
      setPendingDate(date);
    }, [date]);

    const handleClose = () => setIsPopoverOpen(false);

    const handleTogglePopover = () => setIsPopoverOpen((prev) => !prev);

    // Clear the date selection
    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDateSelect(undefined);
      setPendingDate({ from: undefined, to: undefined });
      setSelectedRange(null);
    };

    // Apply the pending changes
    const handleApply = () => {
      if (pendingDate?.from) {
        onDateSelect({
          from: pendingDate.from,
          to: pendingDate.to || pendingDate.from,
        });
      }
      setIsPopoverOpen(false);
    };

    // Reset to the original date
    const handleReset = () => {
      setPendingDate(date);
      setMonthFrom(date?.from);
      setYearFrom(date?.from?.getFullYear());
      setMonthTo(numberOfMonths === 2 ? date?.to : date?.from);
      setYearTo(numberOfMonths === 2 ? date?.to?.getFullYear() : date?.from?.getFullYear());
      setSelectedRange(null);
    };

    const selectDateRange = (from: Date, to: Date, range: string) => {
      const startDate = startOfDay(toDate(from, { timeZone }));
      const endDate = numberOfMonths === 2 ? endOfDay(toDate(to, { timeZone })) : startDate;

      // Validate date constraints
      if (isDateDisabled(startDate) || isDateDisabled(endDate)) {
        return; // Don't select if dates are disabled
      }

      // Validate and adjust range if necessary
      let finalDates = { from: startDate, to: endDate };
      if (numberOfMonths === 2 && !isRangeValid(startDate, endDate)) {
        finalDates = adjustRangeToMaxRange(startDate, endDate);

        // If adjustment still results in invalid range, don't select
        if (!isRangeValid(finalDates.from, finalDates.to)) {
          return;
        }
      }

      setPendingDate({ from: finalDates.from, to: finalDates.to });
      setSelectedRange(range);
      setMonthFrom(finalDates.from);
      setYearFrom(finalDates.from.getFullYear());
      setMonthTo(finalDates.to);
      setYearTo(finalDates.to.getFullYear());
      if (closeOnSelect) {
        onDateSelect({ from: finalDates.from, to: finalDates.to });
        setIsPopoverOpen(false);
      }
    };

    const handleDateSelect = (range: DateRange | undefined) => {
      if (range) {
        let from = startOfDay(toDate(range.from as Date, { timeZone }));
        let to = range.to ? endOfDay(toDate(range.to, { timeZone })) : from;
        if (numberOfMonths === 1) {
          if (range.from !== pendingDate?.from) {
            to = from;
          } else {
            from = startOfDay(toDate(range.to as Date, { timeZone }));
          }
        }

        // Validate date constraints
        if (isDateDisabled(from) || isDateDisabled(to)) {
          return; // Don't select if dates are disabled
        }

        // Validate and adjust range if necessary
        let finalDates = { from, to };
        if (numberOfMonths === 2 && !isRangeValid(from, to)) {
          finalDates = adjustRangeToMaxRange(from, to);

          // If adjustment still results in invalid range, don't select
          if (!isRangeValid(finalDates.from, finalDates.to)) {
            return;
          }
        }

        setPendingDate({ from: finalDates.from, to: finalDates.to });
        setMonthFrom(finalDates.from);
        setYearFrom(finalDates.from.getFullYear());
        setMonthTo(finalDates.to);
        setYearTo(finalDates.to.getFullYear());

        if (closeOnSelect) {
          onDateSelect({ from: finalDates.from, to: finalDates.to });
          setIsPopoverOpen(false);
        }
      }
      setSelectedRange(null);
    };

    const handleMonthChange = (newMonthIndex: number, part: string) => {
      setSelectedRange(null);
      if (part === 'from') {
        if (yearFrom !== undefined) {
          if (newMonthIndex < 0 || newMonthIndex > yearsRange + 1) return;
          const newMonth = new Date(yearFrom, newMonthIndex, 1);
          const from =
            numberOfMonths === 2
              ? startOfMonth(toDate(newMonth, { timeZone }))
              : pendingDate?.from
                ? new Date(
                    pendingDate.from.getFullYear(),
                    newMonth.getMonth(),
                    pendingDate.from.getDate()
                  )
                : newMonth;
          const to =
            numberOfMonths === 2
              ? pendingDate?.to
                ? endOfDay(toDate(pendingDate.to, { timeZone }))
                : endOfMonth(toDate(newMonth, { timeZone }))
              : from;
          if (from <= to) {
            setPendingDate({ from, to });
            setMonthFrom(newMonth);
            setMonthTo(pendingDate?.to);
          }
        }
      } else {
        if (yearTo !== undefined) {
          if (newMonthIndex < 0 || newMonthIndex > yearsRange + 1) return;
          const newMonth = new Date(yearTo, newMonthIndex, 1);
          const from = pendingDate?.from
            ? startOfDay(toDate(pendingDate.from, { timeZone }))
            : startOfMonth(toDate(newMonth, { timeZone }));
          const to = numberOfMonths === 2 ? endOfMonth(toDate(newMonth, { timeZone })) : from;
          if (from <= to) {
            setPendingDate({ from, to });
            setMonthTo(newMonth);
            setMonthFrom(pendingDate?.from);
          }
        }
      }
    };

    const handleYearChange = (newYear: number, part: string) => {
      setSelectedRange(null);
      if (part === 'from') {
        if (years.includes(newYear)) {
          const newMonth = monthFrom
            ? new Date(newYear, monthFrom ? monthFrom.getMonth() : 0, 1)
            : new Date(newYear, 0, 1);
          const from =
            numberOfMonths === 2
              ? startOfMonth(toDate(newMonth, { timeZone }))
              : pendingDate?.from
                ? new Date(newYear, newMonth.getMonth(), pendingDate.from.getDate())
                : newMonth;
          const to =
            numberOfMonths === 2
              ? pendingDate?.to
                ? endOfDay(toDate(pendingDate.to, { timeZone }))
                : endOfMonth(toDate(newMonth, { timeZone }))
              : from;
          if (from <= to) {
            setPendingDate({ from, to });
            setYearFrom(newYear);
            setMonthFrom(newMonth);
            setYearTo(pendingDate?.to?.getFullYear());
            setMonthTo(pendingDate?.to);
          }
        }
      } else {
        if (years.includes(newYear)) {
          const newMonth = monthTo
            ? new Date(newYear, monthTo.getMonth(), 1)
            : new Date(newYear, 0, 1);
          const from = pendingDate?.from
            ? startOfDay(toDate(pendingDate.from, { timeZone }))
            : startOfMonth(toDate(newMonth, { timeZone }));
          const to = numberOfMonths === 2 ? endOfMonth(toDate(newMonth, { timeZone })) : from;
          if (from <= to) {
            setPendingDate({ from, to });
            setYearTo(newYear);
            setMonthTo(newMonth);
            setYearFrom(pendingDate?.from?.getFullYear());
            setMonthFrom(pendingDate?.from);
          }
        }
      }
    };

    const years = Array.from(
      { length: yearsRange + 1 },
      (_, i) => today.getFullYear() - yearsRange / 2 + i
    );

    // Default date range presets
    const defaultDateRangePresets: DateRangePreset[] = [
      { key: 'today', label: 'Today', start: today, end: today },
      { key: 'yesterday', label: 'Yesterday', start: subDays(today, 1), end: subDays(today, 1) },
      {
        key: 'thisWeek',
        label: 'This Week',
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      },
      {
        key: 'lastWeek',
        label: 'Last Week',
        start: subDays(startOfWeek(today, { weekStartsOn: 1 }), 7),
        end: subDays(endOfWeek(today, { weekStartsOn: 1 }), 7),
      },
      {
        key: 'last7Days',
        label: 'Last 7 Days',
        start: subDays(today, 6),
        end: today,
      },
      {
        key: 'thisMonth',
        label: 'This Month',
        start: startOfMonth(today),
        end: endOfMonth(today),
      },
      {
        key: 'lastMonth',
        label: 'Last Month',
        start: startOfMonth(subDays(today, today.getDate())),
        end: endOfMonth(subDays(today, today.getDate())),
      },
      {
        key: 'thisYear',
        label: 'This Year',
        start: startOfYear(today),
        end: endOfYear(today),
      },
      {
        key: 'lastYear',
        label: 'Last Year',
        start: startOfYear(subDays(today, 365)),
        end: endOfYear(subDays(today, 365)),
      },
    ];

    // Use custom presets if provided, otherwise use default presets
    const allDateRangePresets = customPresets || defaultDateRangePresets;

    // Filter presets based on date constraints and excludePresets
    const dateRanges = React.useMemo(() => {
      return allDateRangePresets.filter((preset) => {
        // Check if preset is excluded
        if (excludePresets?.includes(preset.key)) return false;

        // Check if preset dates are within constraints
        const startValid = !isDateDisabled(preset.start);
        const endValid = !isDateDisabled(preset.end);

        // Check if preset range is within maxRange limit
        const rangeValid = numberOfMonths === 1 || isRangeValid(preset.start, preset.end);

        return startValid && endValid && rangeValid;
      });
    }, [isDateDisabled, excludePresets, numberOfMonths, isRangeValid]);

    const handleMouseOver = (part: string) => {
      setHighlightedPart(part);
    };

    const handleMouseLeave = () => {
      setHighlightedPart(null);
    };

    const handleWheel = (event: React.WheelEvent) => {
      event.preventDefault();
      setSelectedRange(null);
      if (highlightedPart === 'firstDay') {
        const newDate = new Date(pendingDate?.from as Date);
        const increment = event.deltaY > 0 ? -1 : 1;
        newDate.setDate(newDate.getDate() + increment);
        if (newDate <= (pendingDate?.to as Date)) {
          numberOfMonths === 2
            ? setPendingDate({ from: newDate, to: new Date(pendingDate?.to as Date) })
            : setPendingDate({ from: newDate, to: newDate });
          setMonthFrom(newDate);
        } else if (newDate > (pendingDate?.to as Date) && numberOfMonths === 1) {
          setPendingDate({ from: newDate, to: newDate });
          setMonthFrom(newDate);
        }
      } else if (highlightedPart === 'firstMonth') {
        const currentMonth = monthFrom ? monthFrom.getMonth() : 0;
        const newMonthIndex = currentMonth + (event.deltaY > 0 ? -1 : 1);
        handleMonthChange(newMonthIndex, 'from');
      } else if (highlightedPart === 'firstYear' && yearFrom !== undefined) {
        const newYear = yearFrom + (event.deltaY > 0 ? -1 : 1);
        handleYearChange(newYear, 'from');
      } else if (highlightedPart === 'secondDay') {
        const newDate = new Date(pendingDate?.to as Date);
        const increment = event.deltaY > 0 ? -1 : 1;
        newDate.setDate(newDate.getDate() + increment);
        if (newDate >= (pendingDate?.from as Date)) {
          setPendingDate({ from: new Date(pendingDate?.from as Date), to: newDate });
          setMonthTo(newDate);
        }
      } else if (highlightedPart === 'secondMonth') {
        const currentMonth = monthTo ? monthTo.getMonth() : 0;
        const newMonthIndex = currentMonth + (event.deltaY > 0 ? -1 : 1);
        handleMonthChange(newMonthIndex, 'to');
      } else if (highlightedPart === 'secondYear' && yearTo !== undefined) {
        const newYear = yearTo + (event.deltaY > 0 ? -1 : 1);
        handleYearChange(newYear, 'to');
      }
    };

    React.useEffect(() => {
      const firstDayElement = document.getElementById(`firstDay-${id}`);
      const firstMonthElement = document.getElementById(`firstMonth-${id}`);
      const firstYearElement = document.getElementById(`firstYear-${id}`);
      const secondDayElement = document.getElementById(`secondDay-${id}`);
      const secondMonthElement = document.getElementById(`secondMonth-${id}`);
      const secondYearElement = document.getElementById(`secondYear-${id}`);

      const elements = [
        firstDayElement,
        firstMonthElement,
        firstYearElement,
        secondDayElement,
        secondMonthElement,
        secondYearElement,
      ];

      const addPassiveEventListener = (element: HTMLElement | null) => {
        if (element) {
          element.addEventListener('wheel', handleWheel as unknown as EventListener, {
            passive: false,
          });
        }
      };

      elements.forEach(addPassiveEventListener);

      return () => {
        elements.forEach((element) => {
          if (element) {
            element.removeEventListener('wheel', handleWheel as unknown as EventListener);
          }
        });
      };
    }, [highlightedPart, pendingDate]);

    const formatWithTz = (date: Date, fmt: string) => formatInTimeZone(date, timeZone, fmt);

    return (
      <>
        <style>
          {`
            .date-part {
              touch-action: none;
            }
          `}
        </style>
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              ref={ref}
              {...props}
              className={cn('w-full', multiSelectVariants({ variant, className }))}
              onClick={handleTogglePopover}
              suppressHydrationWarning>
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="text-muted-foreground h-4 w-4" />
                  <span>
                    {date?.from ? (
                      date.to ? (
                        <>
                          <span
                            id={`firstDay-${id}`}
                            className={cn(
                              'date-part',
                              highlightedPart === 'firstDay' && 'font-bold underline'
                            )}
                            onMouseOver={() => handleMouseOver('firstDay')}
                            onMouseLeave={handleMouseLeave}>
                            {formatWithTz(date.from, 'dd')}
                          </span>{' '}
                          <span
                            id={`firstMonth-${id}`}
                            className={cn(
                              'date-part',
                              highlightedPart === 'firstMonth' && 'font-bold underline'
                            )}
                            onMouseOver={() => handleMouseOver('firstMonth')}
                            onMouseLeave={handleMouseLeave}>
                            {formatWithTz(date.from, 'LLL')}
                          </span>
                          ,{' '}
                          <span
                            id={`firstYear-${id}`}
                            className={cn(
                              'date-part',
                              highlightedPart === 'firstYear' && 'font-bold underline'
                            )}
                            onMouseOver={() => handleMouseOver('firstYear')}
                            onMouseLeave={handleMouseLeave}>
                            {formatWithTz(date.from, 'y')}
                          </span>
                          {numberOfMonths === 2 && (
                            <>
                              {' - '}
                              <span
                                id={`secondDay-${id}`}
                                className={cn(
                                  'date-part',
                                  highlightedPart === 'secondDay' && 'font-bold underline'
                                )}
                                onMouseOver={() => handleMouseOver('secondDay')}
                                onMouseLeave={handleMouseLeave}>
                                {formatWithTz(date.to, 'dd')}
                              </span>{' '}
                              <span
                                id={`secondMonth-${id}`}
                                className={cn(
                                  'date-part',
                                  highlightedPart === 'secondMonth' && 'font-bold underline'
                                )}
                                onMouseOver={() => handleMouseOver('secondMonth')}
                                onMouseLeave={handleMouseLeave}>
                                {formatWithTz(date.to, 'LLL')}
                              </span>
                              ,{' '}
                              <span
                                id={`secondYear-${id}`}
                                className={cn(
                                  'date-part',
                                  highlightedPart === 'secondYear' && 'font-bold underline'
                                )}
                                onMouseOver={() => handleMouseOver('secondYear')}
                                onMouseLeave={handleMouseLeave}>
                                {formatWithTz(date.to, 'y')}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <span
                            id="day"
                            className={cn(
                              'date-part',
                              highlightedPart === 'day' && 'font-bold underline'
                            )}
                            onMouseOver={() => handleMouseOver('day')}
                            onMouseLeave={handleMouseLeave}>
                            {formatWithTz(date.from, 'dd')}
                          </span>{' '}
                          <span
                            id="month"
                            className={cn(
                              'date-part',
                              highlightedPart === 'month' && 'font-bold underline'
                            )}
                            onMouseOver={() => handleMouseOver('month')}
                            onMouseLeave={handleMouseLeave}>
                            {formatWithTz(date.from, 'LLL')}
                          </span>
                          ,{' '}
                          <span
                            id="year"
                            className={cn(
                              'date-part',
                              highlightedPart === 'year' && 'font-bold underline'
                            )}
                            onMouseOver={() => handleMouseOver('year')}
                            onMouseLeave={handleMouseLeave}>
                            {formatWithTz(date.from, 'y')}
                          </span>
                        </>
                      )
                    ) : (
                      <span className="text-muted-foreground">{placeholder || 'Pick a date'}</span>
                    )}
                  </span>
                </div>
                {date?.from && (
                  <div
                    onClick={handleClear}
                    className="text-muted-foreground hover:text-primary size-4 p-0 hover:bg-transparent">
                    <X size={14} />
                    <span className="sr-only">Clear date</span>
                  </div>
                )}
              </div>
            </Button>
          </PopoverTrigger>
          {isPopoverOpen && (
            <PopoverContent
              className="w-auto"
              align="center"
              avoidCollisions={false}
              onInteractOutside={handleClose}
              onEscapeKeyDown={handleClose}
              style={{
                maxHeight: 'var(--radix-popover-content-available-height)',
                overflowY: 'auto',
              }}>
              <div className="flex">
                {numberOfMonths === 2 && (
                  <div className="border-foreground/10 hidden flex-col gap-1 border-r pr-4 text-left md:flex">
                    {dateRanges.map(({ key, label, start, end }) => (
                      <Button
                        key={key}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'hover:bg-primary/90 hover:text-background justify-start',
                          selectedRange === label &&
                            'bg-primary text-background hover:bg-primary/90 hover:text-background'
                        )}
                        onClick={() => {
                          selectDateRange(start, end, label);
                          setMonthFrom(start);
                          setYearFrom(start.getFullYear());
                          setMonthTo(end);
                          setYearTo(end.getFullYear());
                        }}>
                        {label}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex flex-col">
                  <div className="flex items-center gap-4">
                    <div className="ml-3 flex gap-2">
                      <Select
                        onValueChange={(value) => {
                          handleMonthChange(months.indexOf(value), 'from');
                          setSelectedRange(null);
                        }}
                        value={monthFrom ? months[monthFrom.getMonth()] : undefined}>
                        <SelectTrigger className="hover:bg-accent hover:text-accent-foreground hidden w-[122px] font-medium focus:ring-0 focus:ring-offset-0 sm:flex">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, idx) => (
                            <SelectItem key={idx} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        onValueChange={(value) => {
                          handleYearChange(Number(value), 'from');
                          setSelectedRange(null);
                        }}
                        value={yearFrom ? yearFrom.toString() : undefined}>
                        <SelectTrigger className="hover:bg-accent hover:text-accent-foreground hidden w-[122px] font-medium focus:ring-0 focus:ring-offset-0 sm:flex">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year, idx) => (
                            <SelectItem key={idx} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {numberOfMonths === 2 && (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(value) => {
                            handleMonthChange(months.indexOf(value), 'to');
                            setSelectedRange(null);
                          }}
                          value={monthTo ? months[monthTo.getMonth()] : undefined}>
                          <SelectTrigger className="hover:bg-accent hover:text-accent-foreground hidden w-[122px] font-medium focus:ring-0 focus:ring-offset-0 sm:flex">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((month, idx) => (
                              <SelectItem key={idx} value={month}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          onValueChange={(value) => {
                            handleYearChange(Number(value), 'to');
                            setSelectedRange(null);
                          }}
                          value={yearTo ? yearTo.toString() : undefined}>
                          <SelectTrigger className="hover:bg-accent hover:text-accent-foreground hidden w-[122px] font-medium focus:ring-0 focus:ring-offset-0 sm:flex">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((year, idx) => (
                              <SelectItem key={idx} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div className="flex">
                    <Calendar
                      mode="range"
                      defaultMonth={monthFrom}
                      month={monthFrom}
                      onMonthChange={setMonthFrom}
                      selected={pendingDate}
                      onSelect={handleDateSelect}
                      numberOfMonths={numberOfMonths}
                      showOutsideDays={false}
                      disabled={isDateDisabled}
                      fromDate={effectiveMinDate}
                      toDate={effectiveMaxDate}
                      className={className}
                    />
                  </div>
                  {!closeOnSelect && (
                    <div className="flex justify-end gap-2 border-t p-3">
                      <Button variant="outline" size="sm" onClick={handleReset} type="button">
                        Reset
                      </Button>
                      <Button size="sm" onClick={handleApply} type="button">
                        Apply
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          )}
        </Popover>
      </>
    );
  }
);

CalendarDatePicker.displayName = 'CalendarDatePicker';
