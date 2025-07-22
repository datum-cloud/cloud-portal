'use client';

import { useFilterUpdater } from './data-table-filter-context';
import { FilterSelectProps } from './types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/misc';
import { useQueryState, parseAsString } from 'nuqs';
import { useCallback } from 'react';

export const FilterSelect = ({
  options,
  placeholder = 'Select...',
  filterKey,
  className,
}: FilterSelectProps) => {
  // Register with context
  useFilterUpdater(filterKey);

  // Use nuqs directly for state management
  const [value, setValue] = useQueryState(
    filterKey,
    parseAsString.withDefault('').withOptions({
      shallow: false,
      throttleMs: 300,
    })
  );

  const handleValueChange = useCallback(
    (newValue: string) => {
      setValue(newValue === 'all' ? null : newValue);
    },
    [setValue]
  );

  return (
    <Select value={value || 'all'} onValueChange={handleValueChange}>
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
