import { useFilter } from '../filter.context';
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
import { cn } from '@/utils/misc';
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
  disabled?: boolean;
  multiple?: boolean;
  searchable?: boolean;
  options: SelectOption[];
}

export function SelectFilter({
  filterKey,
  label,
  description,
  placeholder,
  className,
  disabled,
  multiple = false,
  searchable = false,
  options,
}: SelectFilterProps) {
  const { value, setValue, reset } = useFilter<string | string[]>(filterKey);
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
        setValue(newValues);
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
        const currentValues = (value as string[]) || [];
        setValue(currentValues.filter((v) => v !== optionValue));
      } else {
        reset();
      }
    },
    [value, setValue, multiple, reset]
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
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !hasValues && 'text-muted-foreground'
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
                          <X
                            className="hover:text-destructive ml-1 h-3 w-3 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(val);
                            }}
                          />
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
                <X
                  className="hover:text-destructive h-4 w-4 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                />
              )}
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
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
                      className="flex items-center gap-2">
                      <Check className={cn('h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                      {option.icon && <span>{option.icon}</span>}
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.description && (
                          <div className="text-muted-foreground text-sm">{option.description}</div>
                        )}
                      </div>
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
                <X
                  className="hover:text-destructive ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => handleRemove(val)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
