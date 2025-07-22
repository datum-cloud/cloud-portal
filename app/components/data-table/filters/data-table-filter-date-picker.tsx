'use client';

import { useFilterValue, useFilterUpdater, useFilterClearer } from './data-table-filter-context';
import { FilterDatePickerProps } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/misc';
import { Calendar, X } from 'lucide-react';
import { useCallback, useState } from 'react';

export const FilterDatePicker = ({
  placeholder = 'Select date...',
  filterKey,
  mode = 'single',
  className,
}: FilterDatePickerProps) => {
  const dateValue = useFilterValue(filterKey);
  const updateDateValue = useFilterUpdater(filterKey);
  const clearDateValue = useFilterClearer(filterKey);

  const [isOpen, setIsOpen] = useState(false);

  const handleDateChange = useCallback(
    (value: string) => {
      updateDateValue(value || null);
    },
    [updateDateValue]
  );

  const handleClear = useCallback(() => {
    clearDateValue();
  }, [clearDateValue]);

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
            {(typeof dateValue === 'string' ? dateValue : '') || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-2">
            <Input
              type="date"
              value={typeof dateValue === 'string' ? dateValue : ''}
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
