import { Button } from '@datum-cloud/datum-ui/button';
import { Calendar } from '@datum-cloud/datum-ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@datum-cloud/datum-ui/popover';
import { cn } from '@datum-cloud/datum-ui/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

export interface SingleDatePickerProps {
  /** ISO date string (YYYY-MM-DD) or full ISO datetime */
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePast?: boolean;
  disableFuture?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  triggerClassName?: string;
  /** Required when used inside a Dialog/Modal */
  modal?: boolean;
}

function parseValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatAsYmd(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Single-date picker that mirrors the visual pattern of datum-ui's
 * CalendarDatePicker / DateTimePicker (popover with calendar) but emits
 * a date-only value (YYYY-MM-DD). For use cases where time is not needed.
 */
export function SingleDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled,
  disablePast,
  disableFuture,
  minDate,
  maxDate,
  className,
  triggerClassName,
  modal = true,
}: SingleDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseValue(value);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveMinDate = minDate ?? (disablePast ? today : undefined);
  const effectiveMaxDate = maxDate ?? (disableFuture ? today : undefined);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange?.(formatAsYmd(date));
    setOpen(false);
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen} modal={modal}>
        <PopoverTrigger asChild>
          <Button
            type="quaternary"
            theme="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !selected && 'text-muted-foreground',
              triggerClassName
            )}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="flex-1">{selected ? format(selected, 'PP') : placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={(date) => {
              if (effectiveMinDate && date < effectiveMinDate) return true;
              if (effectiveMaxDate && date > effectiveMaxDate) return true;
              return false;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
