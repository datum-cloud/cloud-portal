/**
 * MetricsFilterSelect - Select filter component for metrics with URL state support
 */
import { useMetrics } from '../../context/metrics.context';
import type { FilterOption } from '../../types/metrics.type';
import { createMetricsParser } from '../../utils/url-parsers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/common';
import { Check, ChevronDown, X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useCallback, useState, useEffect } from 'react';

export interface MetricsFilterSelectProps {
  filterKey: string;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  options: FilterOption[];
  defaultValue?: string | string[];
}

export function MetricsFilterSelect({
  filterKey,
  label,
  description,
  placeholder = 'Select...',
  className,
  disabled = false,
  multiple = false,
  searchable = false,
  options = [],
  defaultValue = multiple ? [] : '',
}: MetricsFilterSelectProps) {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();
  const [open, setOpen] = useState(false);

  // Create URL state hook first to get initial value from URL
  const [value, setValue] = useQueryState(
    filterKey,
    createMetricsParser(multiple ? 'array' : 'string', defaultValue)
  );

  // Register URL state for this filter with the actual initial value
  useEffect(() => {
    registerUrlState(filterKey, multiple ? 'array' : 'string', value || defaultValue);
  }, [registerUrlState, filterKey, multiple, defaultValue]);

  // Update registry with actual URL state hooks whenever value changes
  useEffect(() => {
    updateUrlStateEntry(filterKey, value, setValue);
  }, [updateUrlStateEntry, filterKey, value, setValue]);

  const reset = useCallback(() => {
    if (multiple) {
      setValue(Array.isArray(defaultValue) ? defaultValue.join(',') : '');
    } else {
      setValue(typeof defaultValue === 'string' ? defaultValue : '');
    }
  }, [setValue, defaultValue, multiple]);

  // Handle single/multiple selection - parse value properly
  const selectedValues = multiple
    ? value
      ? (value as string).split(',').filter(Boolean)
      : []
    : value
      ? [value as string]
      : [];

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const currentValues = value ? (value as string).split(',').filter(Boolean) : [];
        const newValues = currentValues.includes(optionValue)
          ? currentValues.filter((v) => v !== optionValue)
          : [...currentValues, optionValue];
        setValue(newValues.join(','));
      } else {
        setValue(optionValue === value ? '' : optionValue);
        setOpen(false);
      }
    },
    [value, setValue, multiple]
  );

  const handleRemove = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const currentValues = value ? (value as string).split(',').filter(Boolean) : [];
        setValue(currentValues.filter((v) => v !== optionValue).join(','));
      } else {
        reset();
      }
    },
    [value, setValue, reset, multiple]
  );

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;

    if (multiple) {
      if (selectedValues.length === 1) {
        const option = options.find((opt) => opt.value === selectedValues[0]);
        return option?.label || selectedValues[0];
      }
      return `${selectedValues.length} selected`;
    }

    const option = options.find((opt) => opt.value === selectedValues[0]);
    return option?.label || selectedValues[0];
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <Label htmlFor={filterKey} className="text-sm font-medium">
          {label}
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={filterKey}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'h-[36px] min-w-16 justify-between px-2',
              !selectedValues.length && 'text-muted-foreground'
            )}
            disabled={disabled}>
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="p-0" align="start">
          <Command>
            {searchable && <CommandInput placeholder="Search..." />}
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      onSelect={() => handleSelect(option.value)}>
                      <div className="flex flex-1 items-center gap-2">
                        {option.icon}
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          {option.description && (
                            <div className="text-muted-foreground text-xs">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <Check
                        className={cn('ml-auto h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected values display for multiple selection */}
      {multiple && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedValues.map((val) => {
            const option = options.find((opt) => opt.value === val);
            return (
              <Badge key={val} variant="secondary" className="flex items-center gap-1 text-xs">
                {option?.label || val}
                <X
                  className="hover:text-destructive size-3 cursor-pointer"
                  onClick={() => handleRemove(val)}
                />
              </Badge>
            );
          })}
        </div>
      )}

      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}
