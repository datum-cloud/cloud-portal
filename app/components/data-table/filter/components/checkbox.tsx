import { useArrayFilter } from '../../hooks/useFilterQueryState';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Checkbox } from '@shadcn/ui/checkbox';
import { Label } from '@shadcn/ui/label';
import { ReactNode, useCallback } from 'react';

export interface CheckboxOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface CheckboxFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  options: CheckboxOption[];
}

export function CheckboxFilter({
  filterKey,
  label,
  description,
  className,
  disabled = false,
  options = [],
}: CheckboxFilterProps) {
  const { value, setValue, reset } = useArrayFilter(filterKey);
  const selectedValues = value || [];

  const handleToggle = useCallback(
    (optionValue: string, checked: boolean) => {
      const currentValues = selectedValues;
      if (checked) {
        setValue([...currentValues, optionValue]);
      } else {
        setValue(currentValues.filter((v) => v !== optionValue));
      }
    },
    [selectedValues, setValue]
  );

  const handleSelectAll = useCallback(() => {
    const allValues = options.filter((option) => !option.disabled).map((option) => option.value);
    setValue(allValues);
  }, [options, setValue]);

  const handleClearAll = useCallback(() => {
    reset();
  }, [reset]);

  const enabledOptions = options.filter((option) => !option.disabled);
  const allSelected =
    enabledOptions.length > 0 &&
    enabledOptions.every((option) => selectedValues.includes(option.value));
  const someSelected = selectedValues.length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <div className="space-y-3">
        {/* Select/Clear All Controls */}
        {options.length > 3 && (
          <div className="flex justify-between">
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              onClick={handleSelectAll}
              disabled={allSelected || disabled}
              className="h-6 px-2 text-xs">
              Select All
            </Button>
            <Button
              type="quaternary"
              theme="borderless"
              size="small"
              onClick={handleClearAll}
              disabled={!someSelected || disabled}
              className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs">
              Clear All
            </Button>
          </div>
        )}

        {/* Options List */}
        <div className={cn('space-y-2', options.length > 6 && 'h-48 overflow-y-auto')}>
          <div className="space-y-2">
            {options.map((option) => {
              const isChecked = selectedValues.includes(option.value);
              const id = `${filterKey}_${option.value}`;

              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={id}
                    checked={isChecked}
                    onCheckedChange={(checked) => handleToggle(option.value, checked as boolean)}
                    disabled={option.disabled || disabled}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
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
          </div>
        </div>

        {/* Selection Summary */}
        {someSelected && (
          <div className="text-muted-foreground text-xs">
            {selectedValues.length} of {enabledOptions.length} selected
          </div>
        )}
      </div>
    </div>
  );
}
