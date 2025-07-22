'use client';

import { useFilterUpdater } from './data-table-filter-context';
import { FilterDatePickerProps } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/misc';
import { Calendar, X } from 'lucide-react';
import { useQueryState, parseAsString } from 'nuqs';
import { useCallback, useState } from 'react';

export const FilterDatePicker = ({
  placeholder = 'Select date...',
  filterKey,
  mode = 'single',
  className,
}: FilterDatePickerProps) => {
  // Register with context
  useFilterUpdater(filterKey);

  // Use nuqs directly for state management
  const [dateValue, setDateValue] = useQueryState(
    filterKey,
    parseAsString.withDefault('').withOptions({
      shallow: false,
      throttleMs: 300,
    })
  );

  const [isOpen, setIsOpen] = useState(false);

  const handleDateChange = useCallback(
    (value: string) => {
      setDateValue(value || null);
    },
    [setDateValue]
  );

  const handleClear = useCallback(() => {
    setDateValue(null);
  }, [setDateValue]);

  return (
    <div className={cn('relative flex items-center', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'min-w-[200px] justify-start text-left font-normal',
              !dateValue && 'text-muted-foreground'
            )}>
            <Calendar className="mr-2 h-4 w-4" />
            {dateValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-2">
            <Input
              type="date"
              value={dateValue || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full"
            />
            {mode === 'range' && <Input type="date" placeholder="End date" className="w-full" />}
          </div>
        </PopoverContent>
      </Popover>

      {dateValue && (
        <button
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground ml-2 flex h-4 w-4 items-center justify-center rounded-sm">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
