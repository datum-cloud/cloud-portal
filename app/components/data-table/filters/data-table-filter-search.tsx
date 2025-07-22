'use client';

import { useFilterUpdater } from './data-table-filter-context';
import { FilterSearchProps } from './types';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/misc';
import { Search, X } from 'lucide-react';
import { useQueryState, parseAsString } from 'nuqs';
import { useCallback } from 'react';

export const FilterSearch = ({
  placeholder = 'Search...',
  filterKey = 'search',
  className,
}: FilterSearchProps) => {
  // Register with context (this also returns a placeholder updater)
  useFilterUpdater(filterKey);

  // Use nuqs directly for state management
  const [search, setSearch] = useQueryState(
    filterKey,
    parseAsString.withDefault('').withOptions({
      shallow: false,
      throttleMs: 300,
    })
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value || null);
    },
    [setSearch]
  );

  const handleClear = useCallback(() => {
    setSearch(null);
  }, [setSearch]);

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
      <Input
        placeholder={placeholder}
        value={search || ''}
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
