import { useStringFilter } from '../../hooks/useFilterQueryState';
import { SearchInput } from './shared/search-input';
import { useSearchState } from './shared/use-search-state';

/**
 * Single Column Search Filter Component
 * Searches a specific column by filterKey
 *
 * @example
 * <DataTableFilter.Search filterKey="email" placeholder="Search by email..." />
 */
export interface SearchFilterProps {
  filterKey: string;
  label?: string;
  placeholder?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  debounceMs?: number; // Debounce delay in milliseconds (default: 300)
  immediate?: boolean; // Skip debouncing for immediate updates (default: false)
  inputClassName?: string;
}

export function SearchFilter({
  filterKey,
  label,
  placeholder = 'Search...',
  description,
  className,
  inputClassName,
  disabled = false,
  debounceMs = 300,
  immediate = false,
}: SearchFilterProps) {
  const { value, setValue } = useStringFilter(filterKey);

  // Use shared search state hook
  const { localValue, handleChange, handleClear } = useSearchState({
    initialValue: value || '',
    debounceMs,
    immediate,
    onDebouncedChange: setValue,
  });

  return (
    <SearchInput
      id={filterKey}
      value={localValue}
      onChange={handleChange}
      onClear={handleClear}
      placeholder={placeholder}
      label={label}
      description={description}
      disabled={disabled}
      className={className}
      inputClassName={inputClassName}
    />
  );
}
