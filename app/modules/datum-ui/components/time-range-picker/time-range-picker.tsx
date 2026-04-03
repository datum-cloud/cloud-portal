// app/modules/datum-ui/components/time-range-picker/time-range-picker.tsx
import { CustomRangePanel } from './components/absolute-range-panel';
import { QuickRangesPanel } from './components/quick-ranges-panel';
import { DEFAULT_PRESETS, getDefaultPreset, getPresetByShortcut, getPresetRange } from './presets';
import type { TimeRangeValue, PresetConfig } from './types';
import { formatTimeRangeDisplay } from './utils/format-display';
import {
  getBrowserTimezone,
  formatTimezoneLabel,
  utcStringToZonedDate,
  zonedDateToUtcString,
} from './utils/timezone';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { Button, Icon } from '@datum-ui/components';
import { Calendar } from '@datum-ui/components';
import { MobileSheet } from '@datum-ui/components/mobile-sheet';
import { cn } from '@shadcn/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { Separator } from '@shadcn/ui/separator';
import { Calendar as CalendarIcon, Globe, X } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { DateRange as DayPickerDateRange } from 'react-day-picker';

export interface TimeRangePickerProps {
  /** Current value (controlled) - stores UTC timestamps */
  value: TimeRangeValue | null;
  /** Called when value changes */
  onChange: (value: TimeRangeValue) => void;
  /** Called when clear button is clicked - clears URL params and resets to default */
  onClear?: () => void;

  /** User's timezone (for display conversion) */
  timezone?: string;

  /** Preset configurations */
  presets?: PresetConfig[];

  /** Disable future dates */
  disableFuture?: boolean;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Minimum selectable date */
  minDate?: Date;

  /** Custom class name */
  className?: string;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Popover alignment */
  align?: 'start' | 'center' | 'end';
  /** Popover side */
  side?: 'top' | 'bottom';
}

export function TimeRangePicker({
  value,
  onChange,
  onClear,
  timezone: timezoneProp,
  presets = DEFAULT_PRESETS,
  disableFuture = false,
  maxDate,
  minDate,
  className,
  disabled = false,
  placeholder = 'Select time range',
  align = 'start',
  side = 'bottom',
}: TimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'mobile';

  // Effective timezone
  const timezone = timezoneProp ?? getBrowserTimezone();

  // Get default range for initial state - memoized to prevent recalculation on every render
  const defaultPreset = getDefaultPreset(presets);
  const defaultRange = useMemo(
    () => getPresetRange(defaultPreset, timezone),
    [defaultPreset, timezone]
  );

  // Current UTC values (from value or default)
  const currentFromUtc = value?.from ?? defaultRange.from;
  const currentToUtc = value?.to ?? defaultRange.to;

  // Convert UTC to zoned dates for calendar display
  const calendarRange = useMemo<DayPickerDateRange | undefined>(() => {
    try {
      return {
        from: utcStringToZonedDate(currentFromUtc, timezone),
        to: utcStringToZonedDate(currentToUtc, timezone),
      };
    } catch {
      return undefined;
    }
  }, [currentFromUtc, currentToUtc, timezone]);

  // Effective value (use default if no value provided)
  const effectiveValue = useMemo<TimeRangeValue>(() => {
    // If we have a preset key but missing timestamps (from URL deserialization),
    // recalculate the timestamps from the preset
    if (value?.type === 'preset' && value?.preset && (!value?.from || !value?.to)) {
      const preset = presets.find((p) => p.key === value.preset) ?? defaultPreset;
      const range = getPresetRange(preset, timezone);
      return {
        type: 'preset',
        preset: preset.key,
        from: range.from,
        to: range.to,
      };
    }

    if (value?.from && value?.to) {
      return value;
    }
    // Return default preset value
    return {
      type: 'preset',
      preset: defaultPreset.key,
      from: defaultRange.from,
      to: defaultRange.to,
    };
  }, [value, defaultPreset, defaultRange.from, defaultRange.to, presets, timezone]);

  // Display text for trigger button
  const displayText = useMemo(
    () => formatTimeRangeDisplay(effectiveValue, timezone) || placeholder,
    [effectiveValue, timezone, placeholder]
  );

  // Handle preset selection (instant apply)
  const handlePresetSelect = useCallback(
    (preset: PresetConfig) => {
      const range = getPresetRange(preset, timezone);
      onChange({
        type: 'preset',
        preset: preset.key,
        from: range.from,
        to: range.to,
      });
      setOpen(false);
    },
    [onChange, timezone]
  );

  // Track if user has interacted with calendar (via day click)
  const userClickedCalendarRef = useRef(false);

  // Handle calendar day click - fires BEFORE onSelect
  const handleDayClick = useCallback(() => {
    userClickedCalendarRef.current = true;
  }, []);

  // Handle calendar range selection
  const handleCalendarSelect = useCallback(
    (range: DayPickerDateRange | undefined) => {
      if (!userClickedCalendarRef.current) return;
      userClickedCalendarRef.current = false;

      if (range?.from && range?.to) {
        const now = new Date();
        const fromStart = new Date(range.from);
        fromStart.setHours(0, 0, 0, 0);
        const toEnd = new Date(range.to);
        toEnd.setHours(23, 59, 59, 999);
        const effectiveToEnd = toEnd > now ? now : toEnd;

        onChange({
          type: 'custom',
          from: zonedDateToUtcString(fromStart, timezone),
          to: zonedDateToUtcString(effectiveToEnd, timezone),
        });
      } else if (range?.from) {
        const now = new Date();
        const fromStart = new Date(range.from);
        fromStart.setHours(0, 0, 0, 0);
        const toEnd = new Date(range.from);
        toEnd.setHours(23, 59, 59, 999);
        const effectiveToEnd = toEnd > now ? now : toEnd;

        onChange({
          type: 'custom',
          from: zonedDateToUtcString(fromStart, timezone),
          to: zonedDateToUtcString(effectiveToEnd, timezone),
        });
      }
    },
    [onChange, timezone]
  );

  // Handle custom range input changes
  const handleCustomRangeChange = useCallback(
    (fromUtc: string, toUtc: string) => {
      onChange({ type: 'custom', from: fromUtc, to: toUtc });
    },
    [onChange]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const preset = getPresetByShortcut(e.key, presets);
      if (preset) {
        e.preventDefault();
        handlePresetSelect(preset);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, presets, handlePresetSelect]);

  // Effective max date
  const effectiveMaxDate = disableFuture ? new Date() : maxDate;

  // Handle clear button click
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClear?.();
    },
    [onClear]
  );

  const showClearButton = value && onClear;

  // Shared trigger button
  const triggerButton = (
    <Button
      type="quaternary"
      theme="outline"
      disabled={disabled}
      className={cn(
        'text-foreground items-center justify-between gap-2 px-3 font-normal sm:min-w-[200px]',
        className
      )}>
      <div className="flex flex-1 items-center gap-2">
        <Icon icon={CalendarIcon} size={16} />
        <span className="truncate text-xs">{displayText}</span>
      </div>
      {showClearButton && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleClear(e);
          }}
          className={cn(
            'size-[14px] shrink-0 p-0 hover:bg-transparent',
            'hover:text-destructive text-icon-quaternary hover:bg-transparent dark:text-white',
            'focus:ring-ring focus:ring-2 focus:ring-offset-1 focus:outline-none',
            'disabled:pointer-events-none disabled:opacity-50',
            'transition-colors'
          )}
          aria-label="Clear time range">
          <Icon icon={X} size={14} />
        </div>
      )}
    </Button>
  );

  // Shared picker content
  const pickerContent = (
    <>
      {/* Main content: Calendar (left) + Presets (right) */}
      <div className="divide-border flex flex-col divide-x sm:flex-row">
        <div className="flex-1 px-0">
          <Calendar
            className="w-full"
            mode="range"
            defaultMonth={calendarRange?.from}
            selected={calendarRange}
            onSelect={handleCalendarSelect}
            onDayClick={handleDayClick}
            numberOfMonths={1}
            disabled={(date) => {
              if (effectiveMaxDate && date > effectiveMaxDate) return true;
              if (minDate && date < minDate) return true;
              return false;
            }}
            initialFocus
          />
        </div>
        <div className="p-3">
          <QuickRangesPanel
            presets={presets}
            value={effectiveValue}
            onPresetSelect={handlePresetSelect}
          />
        </div>
      </div>

      <Separator />

      {/* Custom range inputs */}
      <div className="p-3">
        <CustomRangePanel
          fromUtc={currentFromUtc}
          toUtc={currentToUtc}
          timezone={timezone}
          onRangeChange={handleCustomRangeChange}
          disableFuture={disableFuture}
        />
      </div>

      <Separator />

      {/* Timezone indicator */}
      <div className="text-muted-foreground bg-muted/30 flex items-center gap-2 px-3 py-2 text-xs">
        <Globe className="h-3.5 w-3.5" />
        <span>Your timezone: {formatTimezoneLabel(timezone)}</span>
      </div>
    </>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <>
        <div className="relative inline-flex" onClick={() => setOpen(true)}>
          {triggerButton}
        </div>
        <MobileSheet
          open={open}
          onOpenChange={setOpen}
          title="Select time range"
          description="Choose a preset or custom date range">
          {pickerContent}
        </MobileSheet>
      </>
    );
  }

  // Desktop/Tablet: popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative inline-flex">
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      </div>
      <PopoverContent className="w-auto rounded-xl p-0" align={align} side={side} sideOffset={4}>
        {pickerContent}
      </PopoverContent>
    </Popover>
  );
}
