import { useArrayFilter } from '../../../hooks/useFilterQueryState';
import { Badge } from '@datum-ui/components';
import { Label } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { X } from 'lucide-react';
import { ReactNode, useCallback } from 'react';

export interface TagOption {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TagFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  options: TagOption[];
}

export function TagFilter({
  filterKey,
  label,
  description,
  className,
  disabled = false,
  options = [],
}: TagFilterProps) {
  const { value, setValue } = useArrayFilter(filterKey);

  // Normalize value to always be an array (handles string from URL on refresh)
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const handleToggle = useCallback(
    (optionValue: string) => {
      const isSelected = selectedValues.includes(optionValue);
      if (isSelected) {
        setValue(selectedValues.filter((v) => v !== optionValue));
      } else {
        setValue([...selectedValues, optionValue]);
      }
    },
    [selectedValues, setValue]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          const isDisabled = option.disabled || disabled;

          return (
            <Badge
              key={option.value}
              type={isSelected ? 'secondary' : 'quaternary'}
              theme={isSelected ? 'solid' : 'outline'}
              className={cn(
                'cursor-pointer gap-1 rounded-lg font-normal transition-all select-none',
                isDisabled && 'cursor-not-allowed opacity-50'
              )}
              onClick={() => !isDisabled && handleToggle(option.value)}>
              {option.icon && option.icon}
              {option.label}
              {isSelected && !isDisabled && (
                <Icon
                  icon={X}
                  className="size-3 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(option.value);
                  }}
                />
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
