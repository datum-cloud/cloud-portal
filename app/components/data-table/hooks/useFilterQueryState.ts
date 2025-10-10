import { useDataTableFilter, FilterValue } from '../data-table.context';
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

// Helper to serialize/deserialize date ranges using compact timestamp format
// Format: timestamp_timestamp (e.g., "1728172800_1728345599")
const serializeDateRange = (value: { from?: Date; to?: Date } | null): string => {
  if (!value || (!value.from && !value.to)) return '';

  // Convert dates to Unix timestamps (seconds)
  const startTs = value.from ? Math.floor(value.from.getTime() / 1000) : '';
  const endTs = value.to ? Math.floor(value.to.getTime() / 1000) : '';

  // If both timestamps exist, use compact format
  if (startTs && endTs) {
    return `${startTs}_${endTs}`;
  }

  // If only one exists, still use underscore format
  return `${startTs}_${endTs}`;
};

const deserializeDateRange = (value: string): { from?: Date; to?: Date } | null => {
  if (!value) return null;

  // Try new compact timestamp format (number_number)
  if (/^\d*_\d*$/.test(value)) {
    const [startStr, endStr] = value.split('_');
    return {
      from: startStr ? new Date(parseInt(startStr, 10) * 1000) : undefined,
      to: endStr ? new Date(parseInt(endStr, 10) * 1000) : undefined,
    };
  }

  // Backward compatibility: try JSON format
  try {
    const parsed = JSON.parse(value);
    return {
      from: parsed.from ? new Date(parsed.from) : undefined,
      to: parsed.to ? new Date(parsed.to) : undefined,
    };
  } catch {
    return null;
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
      // Convert string back to Date for date type
      if (!urlValue || urlValue === '' || urlValue === 'null') {
        return null as T;
      }
      try {
        const date = new Date(urlValue);
        return (!isNaN(date.getTime()) ? date : null) as T;
      } catch {
        return null as T;
      }
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
          // Single date: serialize to ISO string or empty string (not null to avoid nuqs issues)
          if (newValue instanceof Date && !isNaN(newValue.getTime())) {
            const isoString = newValue.toISOString();
            setUrlValue(isoString);
          } else {
            setUrlValue(''); // Use empty string instead of null
          }
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
