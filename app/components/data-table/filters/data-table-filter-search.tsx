'use client';

import { useFilterValue, useFilterUpdater, useFilterClearer } from './data-table-filter-context';
import { FilterSearchProps } from './types';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/misc';
import { Search, X } from 'lucide-react';
import { useCallback } from 'react';

export const FilterSearch = ({
  placeholder = 'Search...',
  filterKey = 'search',
  className,
}: FilterSearchProps) => {
  const search = useFilterValue(filterKey);
  const updateSearch = useFilterUpdater(filterKey);
  const clearSearch = useFilterClearer(filterKey);

  const handleSearchChange = useCallback(
    (value: string) => {
      updateSearch(value || null);
    },
    [updateSearch]
  );

  const handleClear = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
      <Input
        placeholder={placeholder}
        value={typeof search === 'string' ? search : ''}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="min-w-[200px] pr-9 pl-9"
      />
      {search && (
        <button
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground absolute right-3 flex h-4 w-4 items-center justify-center rounded-sm">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
