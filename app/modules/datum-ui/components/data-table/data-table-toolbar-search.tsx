import { DataTableSearchConfig } from './data-table.types';
import { useStringFilter } from './hooks/useFilterQueryState';
import { cn } from '@shadcn/lib/utils';
import { Input } from '@shadcn/ui/input';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface DataTableToolbarSearchProps {
  config: DataTableSearchConfig;
  className?: string;
}

/**
 * DataTableToolbarSearch
 *
 * Built-in search component for the DataTable toolbar.
 * Supports both single-column and global multi-column search.
 *
 * Features:
 * - Debounced input for performance
 * - Auto-sync with URL state
 * - Configurable search mode
 * - Accessible search icon
 */
export const DataTableToolbarSearch = ({ config, className }: DataTableToolbarSearchProps) => {
  const { placeholder = 'Search...', filterKey = 'q', debounce = 300 } = config;

  const { value, setValue } = useStringFilter(filterKey, '');
  const [localValue, setLocalValue] = useState(value || '');

  // Sync local value with filter value when it changes externally
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Debounced update to filter state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        setValue(localValue);
      }
    }, debounce);

    return () => clearTimeout(timer);
  }, [localValue, debounce, setValue, value]);

  return (
    <div className={cn('relative max-w-md flex-1', className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        type="search"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="h-9 pl-9"
      />
    </div>
  );
};
