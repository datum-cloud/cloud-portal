import {
  useDateFilter,
  useDateRangeFilter,
} from '@/components/data-table/hooks/useFilterQueryState';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Label } from '@/components/ui/label';
import { useApp } from '@/providers/app.provider';
import { cn } from '@/utils/common';
import { toUTCTimestampStartOfDay, toUTCTimestampEndOfDay } from '@/utils/helpers/timezone';
import { useCallback, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export interface DatePickerFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  mode?: 'single' | 'range';
  closeOnSelect?: boolean; // Whether to close popover on selection
  yearsRange?: number; // Range of years to show in selector
  placeholder?: string;
  excludePresets?: string[];
  // Date range constraints
  minDate?: Date;
  maxDate?: Date;
  disableFuture?: boolean;
  disablePast?: boolean;
  maxRange?: number; // Maximum number of days between start and end date
  // Timezone-aware options
  applyDayBoundaries?: boolean; // Apply start/end of day in user's timezone
  useUserTimezone?: boolean; // Use user's timezone preference for day boundary calculation
}

export function DatePickerFilter({
  filterKey,
  label,
  description,
  className,
  disabled,
  mode = 'single',
  closeOnSelect = true,
  yearsRange = 10,
  placeholder,
  excludePresets,
  minDate,
  maxDate,
  disableFuture = false,
  disablePast = false,
  maxRange,
  applyDayBoundaries = false,
  useUserTimezone = false,
}: DatePickerFilterProps) {
  // Use appropriate hook based on mode
  const singleFilter = useDateFilter(filterKey);
  const rangeFilter = useDateRangeFilter(filterKey);

  const { value, setValue } = mode === 'range' ? rangeFilter : singleFilter;

  // Get user's timezone preference if needed
  const { userPreferences } = useApp();
  const timezone = useMemo(() => {
    if (!useUserTimezone) return undefined;
    return userPreferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, [useUserTimezone, userPreferences]);

  const isRange = mode === 'range';
  const dateValue = value;

  // Convert filter value to CalendarDatePicker format
  const calendarDate = useMemo((): DateRange => {
    if (isRange && dateValue && typeof dateValue === 'object' && 'from' in dateValue) {
      // Range mode: use from and to dates
      const result = {
        from: dateValue.from || undefined,
        to: dateValue.to || undefined,
      };
      return result;
    } else if (!isRange && dateValue instanceof Date) {
      // Single mode: use the same date for both from and to
      if (!isNaN(dateValue.getTime())) {
        const result = {
          from: dateValue,
          to: dateValue,
        };
        return result;
      } else {
        return {
          from: undefined,
          to: undefined,
        };
      }
    }
    // Empty state
    return {
      from: undefined,
      to: undefined,
    };
  }, [dateValue, isRange, filterKey]);

  // Handle date selection from CalendarDatePicker
  const handleDateSelect = useCallback(
    (range: DateRange | undefined) => {
      // Early return if range is null/undefined
      if (!range || (range.from === null && range.to === null)) {
        setValue(null as any);
        return;
      }

      if (isRange) {
        // Range mode: set both from and to
        // Validate dates before setting
        const validFrom =
          range.from && range.from instanceof Date && !isNaN(range.from.getTime())
            ? range.from
            : undefined;
        const validTo =
          range.to && range.to instanceof Date && !isNaN(range.to.getTime()) ? range.to : undefined;

        // Apply timezone-aware day boundaries if enabled
        if (applyDayBoundaries && useUserTimezone && timezone && validFrom && validTo) {
          const startTimestamp = toUTCTimestampStartOfDay(validFrom, timezone);
          const endTimestamp = toUTCTimestampEndOfDay(validTo, timezone);

          // Create Date objects from UTC timestamps
          const start = new Date(startTimestamp * 1000);
          const end = new Date(endTimestamp * 1000);

          setValue({
            from: start,
            to: end,
          } as any);
        } else {
          setValue({
            from: validFrom,
            to: validTo,
          } as any);
        }
      } else {
        // Single mode: use only the from date
        // Ensure we have a valid date before setting
        if (range.from && range.from instanceof Date && !isNaN(range.from.getTime())) {
          // Apply timezone-aware start of day if enabled
          if (applyDayBoundaries && useUserTimezone && timezone) {
            const startTimestamp = toUTCTimestampStartOfDay(range.from, timezone);
            setValue(new Date(startTimestamp * 1000) as any);
          } else {
            setValue(range.from as any);
          }
        } else {
          // If invalid date, reset to null
          setValue(null as any);
        }
      }
    },
    [setValue, isRange, filterKey, applyDayBoundaries, useUserTimezone, timezone]
  );

  return (
    <div className={cn('min-w-60 space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      {/* Calendar Date Picker */}
      <CalendarDatePicker
        id={`calendar-${filterKey}`}
        date={calendarDate}
        onDateSelect={handleDateSelect}
        numberOfMonths={isRange ? 2 : 1}
        closeOnSelect={closeOnSelect}
        yearsRange={yearsRange}
        variant="outline"
        className={cn('w-full justify-start', disabled && 'pointer-events-none opacity-50')}
        placeholder={placeholder}
        excludePresets={excludePresets}
        minDate={minDate}
        maxDate={maxDate}
        disableFuture={disableFuture}
        disablePast={disablePast}
        maxRange={maxRange}
      />
    </div>
  );
}
