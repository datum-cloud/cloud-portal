import type { FilterValue } from '../metrics-panel-context';
import { useMetricsPanel } from './use-metrics-panel';
import { useCallback, useMemo } from 'react';

/**
 * Hook for individual control components to manage their filter state
 * Similar to DataTable's useFilter hook
 */
export function useMetricsControl<T = FilterValue>(key: string) {
  const { getFilter, setFilter, resetFilter } = useMetricsPanel();

  // Memoize the current value to prevent unnecessary re-renders
  const value = useMemo(() => getFilter<T>(key), [getFilter, key]);

  // Memoize setValue function
  const setValue = useCallback(
    (newValue: T) => {
      setFilter(key, newValue as FilterValue);
    },
    [key, setFilter]
  );

  // Memoize reset function
  const reset = useCallback(() => {
    resetFilter(key);
  }, [key, resetFilter]);

  return useMemo(
    () => ({
      value,
      setValue,
      reset,
    }),
    [value, setValue, reset]
  );
}
