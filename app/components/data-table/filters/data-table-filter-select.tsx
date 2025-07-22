'use client';

import { useFilterValue, useFilterUpdater } from './data-table-filter-context';
import { FilterSelectProps } from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/misc';
import { useCallback } from 'react';

export const FilterSelect = ({
  options,
  placeholder = 'Select...',
  filterKey,
  className,
}: FilterSelectProps) => {
  const value = useFilterValue(filterKey);
  const updateValue = useFilterUpdater(filterKey);

  const handleValueChange = useCallback(
    (newValue: string) => {
      updateValue(newValue === 'all' ? null : newValue);
    },
    [updateValue]
  );

  return (
    <Select value={typeof value === 'string' ? value : 'all'} onValueChange={handleValueChange}>
      <SelectTrigger className={cn('min-w-[150px]', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
