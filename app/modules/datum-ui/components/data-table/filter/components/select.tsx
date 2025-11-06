import { useStringFilter, useArrayFilter } from '../../hooks/useFilterQueryState';
import { Badge } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@shadcn/ui/command';
import { Label } from '@shadcn/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { Check, ChevronDown, X } from 'lucide-react';
import { ReactNode, useCallback, useState } from 'react';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface SelectFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  options: SelectOption[];
}

export function SelectFilter({
  filterKey,
  label,
  description,
  placeholder = 'Select...',
  className,
  triggerClassName,
  disabled = false,
  multiple = false,
  searchable = false,
  options = [],
}: SelectFilterProps) {
  // Use appropriate hook based on multiple selection
  const singleFilter = useStringFilter(filterKey);
  const multipleFilter = useArrayFilter(filterKey);

  const { value, reset } = multiple ? multipleFilter : singleFilter;
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const selectedValues = multiple ? (value as string[]) || [] : value ? [value as string] : [];

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const currentValues = (value as string[]) || [];
        const newValues = currentValues.includes(optionValue)
          ? currentValues.filter((v) => v !== optionValue)
          : [...currentValues, optionValue];
        (multipleFilter.setValue as (value: string[]) => void)(newValues);
      } else {
        (singleFilter.setValue as (value: string) => void)(
          optionValue === value ? '' : optionValue
        );
        setOpen(false);
      }
    },
    [value, singleFilter, multipleFilter, multiple]
  );

  const handleRemove = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const currentValues = (value as string[]) || [];
        (multipleFilter.setValue as (value: string[]) => void)(
          currentValues.filter((v) => v !== optionValue)
        );
      } else {
        reset();
      }
    },
    [value, multipleFilter, multiple, reset]
  );

  const handleClear = useCallback(() => {
    reset();
  }, [reset]);

  const getSelectedOption = (optionValue: string) => {
    return options.find((option) => option.value === optionValue);
  };

  const filteredOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(searchValue.toLowerCase()))
    : options;

  const hasValues = selectedValues.length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-sm font-medium">{label}</Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="quaternary"
            theme="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !hasValues && 'text-muted-foreground',
              triggerClassName
            )}
            disabled={disabled}>
            <div className="flex flex-1 items-center gap-1 overflow-hidden">
              {hasValues ? (
                multiple ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedValues.slice(0, 2).map((val) => {
                      const option = getSelectedOption(val);
                      return option ? (
                        <Badge key={val} variant="secondary" className="text-xs">
                          {option.icon && <span className="mr-1">{option.icon}</span>}
                          {option.label}
                          <button
                            type="button"
                            className="hover:text-destructive ml-1 rounded-sm p-0.5 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(val);
                            }}>
                            <X className="hover:text-destructive cursor-pointer" size={12} />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                    {selectedValues.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{selectedValues.length - 2} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="truncate">
                    {(() => {
                      const option = getSelectedOption(selectedValues[0]);
                      return option ? (
                        <span className="flex items-center gap-1">
                          {option.icon && <span>{option.icon}</span>}
                          {option.label}
                        </span>
                      ) : (
                        selectedValues[0]
                      );
                    })()}
                  </span>
                )
              ) : (
                placeholder || `Select ${label?.toLowerCase() || 'option'}...`
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasValues && (
                <div
                  className="text-muted-foreground hover:text-destructive rounded-sm p-1 transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClear();
                  }}>
                  <X className="size-3 cursor-pointer" size={12} />
                </div>
              )}
              <ChevronDown className="size-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="popover-content-width-full w-full p-0" align="start">
          <Command>
            {searchable && (
              <CommandInput
                placeholder={`Search ${label?.toLowerCase() || 'options'}...`}
                value={searchValue}
                onValueChange={setSearchValue}
              />
            )}
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                      disabled={option.disabled}
                      className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {option.icon && <span>{option.icon}</span>}
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          {option.description && (
                            <div className="text-muted-foreground text-sm">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check
                          className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                        />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected values display for multiple selection */}
      {multiple && hasValues && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedValues.map((val) => {
            const option = getSelectedOption(val);
            return option ? (
              <Badge key={val} variant="outline" className="text-xs">
                {option.icon && <span className="mr-1">{option.icon}</span>}
                {option.label}
                <button
                  type="button"
                  className="hover:text-destructive ml-1 rounded-sm p-0.5 transition-all"
                  onClick={() => handleRemove(val)}>
                  <X className="cursor-pointer" size={12} />
                </button>
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
