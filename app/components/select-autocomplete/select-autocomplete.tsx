import { Option, SelectAutocompleteProps } from './select-autocomplete.types';
import { VirtualizedList } from './virtualized-list';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { ChevronDown, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

export const SelectAutocomplete = React.forwardRef<
  { showPopover: (open: boolean) => void },
  SelectAutocompleteProps
>(
  (
    {
      options,
      keyValue = 'value',
      selectedValue,
      onValueChange,
      placeholder = 'Select...',
      emptyContent = 'No results found',
      triggerClassName,
      contentClassName,
      itemPreview,
      itemContent,
      disabled = false,
      boxClassName,
      disableSearch = false,
      itemSize = 35,
      isLoading = false,
      footer,
      name,
      id,
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [currentValue, setCurrentValue] = useState<string | undefined>(undefined);

    const handleSelect = (option: Option) => {
      setCurrentValue(option[keyValue]);
      setOpen(false);
      onValueChange?.(option);
    };

    const triggerContent = useMemo(() => {
      if (!currentValue) return placeholder;
      return itemPreview?.(selectedValue!) ?? selectedValue?.label;
    }, [currentValue, placeholder, itemPreview, selectedValue]);

    useEffect(() => {
      if (selectedValue) {
        setCurrentValue(selectedValue[keyValue]);
      }
    }, [selectedValue]);

    // Expose showPopover method to parent via ref
    React.useImperativeHandle(
      ref,
      () => ({
        showPopover: (open: boolean) => setOpen(open),
      }),
      [setOpen]
    );

    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                'ring-offset-background placeholder:text-muted-foreground focus:ring-ring relative w-full items-center justify-between px-3 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
                triggerClassName
              )}
              disabled={disabled || isLoading}>
              {isLoading && (
                <div className="bg-background/80 absolute inset-0 flex items-center justify-center">
                  <Loader2 className="mx-auto size-4 animate-spin" />
                </div>
              )}
              <div>{triggerContent}</div>
              <ChevronDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn('popover-content-width-full min-w-[300px] p-0', contentClassName)}
            align="center">
            <VirtualizedList
              disableSearch={disableSearch}
              emptyContent={emptyContent}
              keyValue={keyValue}
              options={options}
              selectedValue={selectedValue}
              itemContent={itemContent}
              onValueChange={handleSelect}
              boxClassName={boxClassName}
              itemSize={itemSize}
            />

            {footer && <div className="border-t">{footer}</div>}
          </PopoverContent>
        </Popover>
        {/* Hidden input for form submission */}
        <select
          name={name}
          id={id}
          value={currentValue}
          defaultValue={currentValue}
          className="absolute top-0 left-0 h-0 w-0"
          onChange={() => undefined}>
          <option value=""></option>
          {options.map((option, idx) => (
            <option key={`${option.value}-${idx}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </>
    );
  }
);

SelectAutocomplete.displayName = 'SelectAutocomplete';
