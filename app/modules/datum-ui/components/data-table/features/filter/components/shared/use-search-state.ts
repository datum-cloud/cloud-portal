import { useDebounce } from '@datum-ui/hooks/use-debounce';
import { useCallback, useEffect, useState } from 'react';

/**
 * Shared hook for managing search input state with debouncing
 * Used by both Search and GlobalSearch components
 */
export interface UseSearchStateOptions {
  initialValue?: string;
  debounceMs?: number;
  immediate?: boolean;
  onDebouncedChange?: (value: string) => void;
}

export function useSearchState({
  initialValue = '',
  debounceMs = 300,
  immediate = false,
  onDebouncedChange,
}: UseSearchStateOptions) {
  const [localValue, setLocalValue] = useState(initialValue);

  // Debounced value that triggers the actual filter update
  const debouncedValue = useDebounce(localValue, immediate ? 0 : debounceMs);

  // Update local value when external value changes (e.g., URL changes, reset)
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  // Trigger callback when debounced value changes
  useEffect(() => {
    if (onDebouncedChange && debouncedValue !== initialValue) {
      onDebouncedChange(debouncedValue);
    }
  }, [debouncedValue, onDebouncedChange, initialValue]);

  // Handle input change
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setLocalValue('');
  }, []);

  return {
    localValue,
    setLocalValue,
    debouncedValue,
    handleChange,
    handleClear,
  };
}
