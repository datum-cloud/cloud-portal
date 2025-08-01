import { useStringFilter } from '../../hooks/useFilterQueryState';
import { Button } from '@/components/ui/button';
import { InputWithAddons } from '@/components/ui/input-with-addons';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/misc';
import { Search, X } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';

export interface SearchFilterProps {
  filterKey: string;
  label?: string;
  placeholder?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  debounceMs?: number; // Debounce delay in milliseconds (default: 300)
  immediate?: boolean; // Skip debouncing for immediate updates (default: false)
}

export function SearchFilter({
  filterKey,
  label,
  placeholder = 'Search...',
  description,
  className,
  disabled = false,
  debounceMs = 300,
  immediate = false,
}: SearchFilterProps) {
  const { value, setValue } = useStringFilter(filterKey);
  const [localValue, setLocalValue] = useState(value || '');

  // Debounced value that triggers the actual filter update
  const debouncedValue = useDebounce(localValue, immediate ? 0 : debounceMs);

  // Update local value when external value changes (e.g., URL changes, reset)
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  // Update filter when debounced value changes
  useEffect(() => {
    if (debouncedValue !== value) {
      setValue(debouncedValue);
    }
  }, [debouncedValue, setValue, value]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  }, []);

  return (
    <div className={cn('min-w-60 space-y-2', className)}>
      {label && (
        <div className="space-y-1">
          <Label htmlFor={filterKey} className="text-sm font-medium">
            {label}
          </Label>
          {description && <p className="text-muted-foreground text-xs">{description}</p>}
        </div>
      )}

      <div className="relative">
        <InputWithAddons
          id={filterKey}
          type="text"
          placeholder={placeholder || 'Search...'}
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
          containerClassName="h-9"
          leading={<Search size={14} className="text-muted-foreground" />}
          trailing={
            localValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLocalValue('')}
                className="text-muted-foreground hover:text-primary size-4 p-0 hover:bg-transparent">
                <X size={14} />
                <span className="sr-only">Clear search</span>
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}
