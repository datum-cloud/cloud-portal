import { useStringFilter } from '../../hooks/useFilterQueryState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/utils/misc';
import { ChevronDown, X } from 'lucide-react';
import { ReactNode, useState, useMemo } from 'react';

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface RadioPopoverFilterProps {
  filterKey: string;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  options: RadioOption[];
}

export function RadioPopoverFilter({
  filterKey,
  label,
  description,
  className,
  disabled = false,
  options,
}: RadioPopoverFilterProps) {
  const { value, setValue } = useStringFilter(filterKey);
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    return label || `Filter ${filterKey}`;
  }, [label, filterKey]);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValue('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">{displayLabel}</Label>
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-8 w-full justify-between"
            disabled={disabled}>
            <div className="flex items-center gap-2">
              {selectedOption ? (
                <Badge variant="secondary" className="h-5 px-1 text-xs" onClick={handleClear}>
                  {selectedOption.label}
                  <X className="ml-1 h-3 w-3 cursor-pointer" />
                </Badge>
              ) : (
                <span className="text-muted-foreground">Select option...</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-3" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{displayLabel}</span>
              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue('')}
                  className="h-6 px-2 text-xs">
                  Clear
                </Button>
              )}
            </div>
            <RadioGroup
              value={value}
              onValueChange={(newValue) => {
                setValue(newValue);
                setOpen(false);
              }}
              disabled={disabled}
              className="space-y-2">
              {options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`${filterKey}-${option.value}`}
                    disabled={option.disabled}
                  />
                  <Label
                    htmlFor={`${filterKey}-${option.value}`}
                    className="flex-1 cursor-pointer text-sm font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
