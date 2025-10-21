import { useDataTableFilter, FilterValue } from '../data-table.context';
import {
  serializeDateRange,
  deserializeDateRange,
  serializeDate,
  deserializeDate,
} from '../utils/date-serialization';
import { useQueryState } from 'nuqs';
import { parseAsString, parseAsArrayOf } from 'nuqs';
import { useEffect, useMemo } from 'react';

// Parser factory for different filter types
const createParser = (type: 'string' | 'array' | 'date' | 'dateRange', defaultValue?: any) => {
  switch (type) {
    case 'string':
      return parseAsString.withDefault(defaultValue || '');
    case 'array':
      return parseAsArrayOf(parseAsString).withDefault(defaultValue || []);
    case 'date':
      // Use string parser and handle date conversion manually to avoid null issues
      return parseAsString.withDefault(defaultValue || '');
    case 'dateRange':
      // For date ranges, we'll serialize as JSON string
      return parseAsString.withDefault(defaultValue || '');
    default:
      return parseAsString.withDefault('');
  }
};

interface UseFilterQueryStateOptions {
  filterKey: string;
  type: 'string' | 'array' | 'date' | 'dateRange';
  defaultValue?: any;
}

/**
 * Hook that manages individual filter state with nuqs URL synchronization
 * This replaces the dynamic parser approach with individual useQueryState hooks
 */
export function useFilterQueryState<T = FilterValue>({
  filterKey,
  type,
  defaultValue,
}: UseFilterQueryStateOptions) {
  const { setFilter, getFilterValue, registerFilterParser } = useDataTableFilter();

  // Create parser for this filter type
  const parser = useMemo(() => createParser(type, defaultValue), [type, defaultValue]);

  // Register parser in the context (for potential future use)
  useEffect(() => {
    registerFilterParser(filterKey, parser);
  }, [filterKey, parser, registerFilterParser]);

  // Use individual useQueryState for this filter
  const [urlValue, setUrlValue] = useQueryState(filterKey, parser);

  // Get current filter value from context
  const contextValue = getFilterValue<T>(filterKey);

  // Determine the current value (context takes precedence)
  const currentValue = useMemo(() => {
    if (contextValue !== undefined && contextValue !== null) {
      return contextValue;
    }
    if (type === 'dateRange' && typeof urlValue === 'string') {
      return deserializeDateRange(urlValue) as T;
    }
    if (type === 'date' && typeof urlValue === 'string') {
      return deserializeDate(urlValue) as T;
    }
    return urlValue as T;
  }, [contextValue, urlValue, type]);

  // Update function that syncs both context and URL
  const setValue = useMemo(
    () => (newValue: T) => {
      // Update context (this will trigger table filters and callbacks)
      setFilter(filterKey, newValue as FilterValue);

      // Update URL state with additional safety checks
      try {
        if (type === 'dateRange' && typeof newValue === 'object' && newValue !== null) {
          const serialized = serializeDateRange(newValue as any);
          setUrlValue(serialized);
        } else if (type === 'date') {
          // Single date: serialize to ISO string or empty string
          const serialized = serializeDate(newValue as Date | null);
          setUrlValue(serialized);
        } else if (newValue === null || newValue === undefined) {
          setUrlValue(null);
        } else {
          setUrlValue(newValue as any);
        }
      } catch (error) {
        console.error(`🚨 Error in setValue for ${filterKey}:`, error, { newValue, type });
        // Fallback to null on any error
        setUrlValue(null);
      }
    },
    [filterKey, setFilter, setUrlValue, type]
  );

  // Reset function
  const reset = useMemo(
    () => () => {
      setValue(defaultValue as T);
    },
    [setValue, defaultValue]
  );

  return {
    value: currentValue,
    setValue,
    reset,
  };
}

// Pre-configured hooks for common filter types
export function useStringFilter(filterKey: string, defaultValue: string = '') {
  return useFilterQueryState<string>({
    filterKey,
    type: 'string',
    defaultValue,
  });
}

export function useArrayFilter(filterKey: string, defaultValue: string[] = []) {
  return useFilterQueryState<string[]>({
    filterKey,
    type: 'array',
    defaultValue,
  });
}

export function useDateFilter(filterKey: string, defaultValue: Date | null = null) {
  return useFilterQueryState<Date | null>({
    filterKey,
    type: 'date',
    defaultValue,
  });
}

export function useDateRangeFilter(
  filterKey: string,
  defaultValue: { from?: Date; to?: Date } | null = null
) {
  return useFilterQueryState<{ from?: Date; to?: Date } | null>({
    filterKey,
    type: 'dateRange',
    defaultValue,
  });
}
