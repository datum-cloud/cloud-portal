import { useFilter } from '../filter.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/misc';
import { format } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';

export interface DatePreset {
  label: string;
  value: { from: Date; to: Date };
  shortcut?: string;
}

// Default presets for range mode
const createDefaultPresets = (): DatePreset[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return [
    {
      label: 'Today',
      value: { from: today, to: today },
      shortcut: 'T',
    },
    {
      label: 'Yesterday',
      value: {
        from: new Date(today.getTime() - 24 * 60 * 60 * 1000),
        to: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      },
      shortcut: 'Y',
    },
    {
      label: 'Last 7 days',
      value: {
        from: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        to: today,
      },
      shortcut: '7D',
    },
    {
      label: 'Last 14 days',
      value: {
        from: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000),
        to: today,
      },
      shortcut: '14D',
    },
    {
      label: 'Last 30 days',
      value: {
        from: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
        to: today,
      },
      shortcut: '30D',
    },
    {
      label: 'Last 90 days',
      value: {
        from: new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000),
        to: today,
      },
      shortcut: '90D',
    },
    {
      label: 'This month',
      value: {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: today,
      },
      shortcut: 'TM',
    },
    {
      label: 'Last month',
      value: {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      },
      shortcut: 'LM',
    },
  ];
};

export interface DatePickerFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  mode?: 'single' | 'range';
  presets?: DatePreset[];
  useDefaultPresets?: boolean; // Whether to use default presets for range mode
}

export function DatePickerFilter({
  filterKey,
  label,
  description,
  className,
  disabled,
  mode = 'single',
  presets,
  useDefaultPresets = true,
}: DatePickerFilterProps) {
  const { value, setValue, reset } = useFilter<Date | { from?: Date; to?: Date }>(filterKey);

  const isRange = mode === 'range';
  const dateValue = value;

  // Determine which presets to use
  const effectivePresets = useMemo(() => {
    if (presets) {
      return presets; // Use provided presets
    }
    if (isRange && useDefaultPresets) {
      return createDefaultPresets(); // Use default presets for range mode
    }
    return []; // No presets
  }, [presets, isRange, useDefaultPresets]);

  const handleSingleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = event.target.value ? new Date(event.target.value) : null;
      setValue(newDate as any);
    },
    [setValue]
  );

  const handleRangeFromChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = event.target.value ? new Date(event.target.value) : null;
      const currentRange = (dateValue as { from?: Date; to?: Date }) || {};
      setValue({
        from: newDate || undefined,
        to: currentRange.to,
      } as any);
    },
    [setValue, dateValue]
  );

  const handleRangeToChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = event.target.value ? new Date(event.target.value) : null;
      const currentRange = (dateValue as { from?: Date; to?: Date }) || {};
      setValue({
        from: currentRange.from,
        to: newDate || undefined,
      } as any);
    },
    [setValue, dateValue]
  );

  const handlePresetSelect = useCallback(
    (preset: DatePreset) => {
      setValue(preset.value as any);
    },
    [setValue]
  );

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const formatDisplayDate = (date: Date | null | undefined): string => {
    if (!date) return '';
    return format(date, 'MMM dd, yyyy');
  };

  const hasValue = isRange
    ? dateValue &&
      typeof dateValue === 'object' &&
      'from' in dateValue &&
      (dateValue.from || dateValue.to)
    : dateValue instanceof Date;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <div className="space-y-2">
        {isRange ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`${filterKey}_from`} className="text-muted-foreground text-xs">
                From
              </Label>
              <div className="relative">
                <Calendar className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id={`${filterKey}_from`}
                  type="date"
                  value={formatDateForInput(
                    dateValue && typeof dateValue === 'object' && 'from' in dateValue
                      ? dateValue.from
                      : null
                  )}
                  onChange={handleRangeFromChange}
                  disabled={disabled}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${filterKey}_to`} className="text-muted-foreground text-xs">
                To
              </Label>
              <div className="relative">
                <Calendar className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id={`${filterKey}_to`}
                  type="date"
                  value={formatDateForInput(
                    dateValue && typeof dateValue === 'object' && 'to' in dateValue
                      ? dateValue.to
                      : null
                  )}
                  onChange={handleRangeToChange}
                  disabled={disabled}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <Calendar className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id={filterKey}
              type="date"
              value={formatDateForInput(dateValue as Date)}
              onChange={handleSingleDateChange}
              disabled={disabled}
              className="pr-9 pl-9"
            />
            {hasValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="hover:bg-muted absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Clear date</span>
              </Button>
            )}
          </div>
        )}

        {/* Date Display */}
        {hasValue && (
          <div className="text-muted-foreground text-xs">
            {isRange && dateValue && typeof dateValue === 'object' && 'from' in dateValue
              ? `${formatDisplayDate(dateValue.from || null)} - ${formatDisplayDate(dateValue.to || null)}`
              : formatDisplayDate(dateValue as Date)}
          </div>
        )}

        {/* Presets */}
        {effectivePresets && effectivePresets.length > 0 && (
          <div className="space-y-1">
            <Label className="text-muted-foreground text-xs">Quick select</Label>
            <div className="flex flex-wrap gap-1">
              {effectivePresets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  className="h-7 text-xs">
                  {preset.label}
                  {preset.shortcut && (
                    <span className="text-muted-foreground ml-1">({preset.shortcut})</span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Clear button */}
        {hasValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground h-7 text-xs">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
