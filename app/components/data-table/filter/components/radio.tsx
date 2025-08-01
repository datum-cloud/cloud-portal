import { useStringFilter } from '../../hooks/useFilterQueryState';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/utils/misc';
import { ReactNode, useCallback } from 'react';

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface RadioFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  options: RadioOption[];
}

export function RadioFilter({
  filterKey,
  label,
  description,
  className,
  disabled = false,
  options = [],
}: RadioFilterProps) {
  const { value, setValue } = useStringFilter(filterKey);
  const selectedValue = value || '';

  const handleValueChange = useCallback(
    (newValue: string) => {
      // Allow deselecting by clicking the same option
      setValue(newValue === selectedValue ? '' : newValue);
    },
    [selectedValue, setValue]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <RadioGroup
        value={selectedValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        className="space-y-2">
        {options.map((option) => {
          const id = `${filterKey}_${option.value}`;
          return (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={id} disabled={option.disabled || disabled} />
              <Label
                htmlFor={id}
                className={cn(
                  'flex flex-1 cursor-pointer items-center gap-2 text-sm font-normal',
                  (option.disabled || disabled) && 'cursor-not-allowed opacity-50'
                )}>
                {option.icon && <span className="shrink-0">{option.icon}</span>}
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-muted-foreground text-xs">{option.description}</div>
                  )}
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
