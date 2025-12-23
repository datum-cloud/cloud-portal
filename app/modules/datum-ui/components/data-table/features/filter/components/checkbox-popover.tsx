import { useArrayFilter } from '../../../hooks/useFilterQueryState';
import { Badge } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Checkbox } from '@datum-ui/components';
import { Label } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { ChevronDown, X } from 'lucide-react';
import { ReactNode, useState, useMemo } from 'react';

export interface CheckboxOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface CheckboxPopoverFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  options: CheckboxOption[];
}

export function CheckboxPopoverFilter({
  filterKey,
  label,
  description,
  className,
  disabled = false,
  options,
}: CheckboxPopoverFilterProps) {
  const { value, setValue } = useArrayFilter(filterKey);
  const selectedValues = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    return label || `Filter ${filterKey}`;
  }, [label, filterKey]);

  const selectedOptions = useMemo(() => {
    return options.filter((option) => selectedValues.includes(option.value));
  }, [options, selectedValues]);

  const handleChange = (optionValue: string, checked: boolean | string) => {
    if (checked) {
      setValue([...selectedValues, optionValue]);
    } else {
      setValue(selectedValues.filter((v) => v !== optionValue));
    }
  };

  const handleRemoveSelection = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setValue(selectedValues.filter((v) => v !== optionValue));
  };

  const handleClearAll = () => {
    setValue([]);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">{displayLabel}</Label>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="quaternary"
            theme="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 w-full justify-between"
            disabled={disabled}>
            <div className="flex flex-wrap gap-1">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground">Select options...</span>
              ) : selectedOptions.length <= 2 ? (
                selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    type="secondary"
                    className="h-5 px-1 text-xs"
                    onClick={(e) => handleRemoveSelection(option.value, e)}>
                    {option.label}
                    <Icon icon={X} className="ml-1 h-3 w-3 cursor-pointer" />
                  </Badge>
                ))
              ) : (
                <Badge type="secondary" className="h-5 px-1 text-xs">
                  {selectedOptions.length} selected
                </Badge>
              )}
            </div>
            <Icon icon={ChevronDown} className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-3" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{displayLabel}</span>
              {selectedValues.length > 0 && (
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  onClick={handleClearAll}
                  className="h-6 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${filterKey}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => handleChange(option.value, checked)}
                    disabled={disabled || option.disabled}
                  />
                  <Label
                    htmlFor={`${filterKey}-${option.value}`}
                    className="flex-1 cursor-pointer text-sm font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
