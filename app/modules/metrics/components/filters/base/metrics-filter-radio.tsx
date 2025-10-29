/**
 * MetricsFilterRadio - Radio filter component for metrics with URL state support
 */
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import type { FilterOption } from '@/modules/metrics/types/metrics.type';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { cn } from '@shadcn/lib/utils';
import { Label } from '@shadcn/ui/label';
import { RadioGroup, RadioGroupItem } from '@shadcn/ui/radio-group';
import { useQueryState } from 'nuqs';
import { useEffect } from 'react';

export interface MetricsFilterRadioProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  options: FilterOption[];
  orientation?: 'horizontal' | 'vertical';
  defaultValue?: string;
}

export function MetricsFilterRadio({
  filterKey,
  label,
  description,
  className,
  disabled = false,
  options = [],
  orientation = 'horizontal',
  defaultValue = '',
}: MetricsFilterRadioProps) {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();

  // Create URL state hook first to get initial value from URL
  const [value, setValue] = useQueryState(filterKey, createMetricsParser('string', defaultValue));

  // Register URL state for this filter with the actual initial value
  useEffect(() => {
    registerUrlState(filterKey, 'string', value || defaultValue);
  }, [registerUrlState, filterKey, defaultValue]);

  // Update registry with actual URL state hooks
  useEffect(() => {
    updateUrlStateEntry(filterKey, value, setValue);
  }, [updateUrlStateEntry, filterKey, value, setValue]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}

      <RadioGroup
        value={value || ''}
        onValueChange={setValue}
        disabled={disabled}
        className={cn(
          orientation === 'horizontal' ? 'flex items-center gap-4' : 'flex flex-col gap-2'
        )}>
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`${filterKey}-${option.value}`}
              disabled={option.disabled}
            />
            <Label
              htmlFor={`${filterKey}-${option.value}`}
              className={cn(
                'cursor-pointer text-sm font-normal',
                option.disabled && 'cursor-not-allowed opacity-50'
              )}>
              <div className="flex items-center gap-2">
                {option.icon}
                <span>{option.label}</span>
              </div>
              {option.description && (
                <div className="text-muted-foreground mt-1 text-xs">{option.description}</div>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}
