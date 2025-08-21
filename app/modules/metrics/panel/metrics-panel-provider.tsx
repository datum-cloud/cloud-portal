'use client';

import { MetricsPanelContextType, MetricsFilterState, FilterValue } from './metrics-panel-context';
import { parseRange } from '@/modules/metrics/utils';
import type { TimeRange } from '@/modules/prometheus';
import { useQueryClient } from '@tanstack/react-query';
import { useQueryState, parseAsString } from 'nuqs';
import React, { createContext, useCallback, useMemo, useState, useEffect } from 'react';

export const MetricsPanelContext = createContext<MetricsPanelContextType | null>(null);

export interface MetricsPanelProviderProps {
  children: React.ReactNode;
  onFiltersChange?: (filters: MetricsFilterState) => void;
  defaultFilters?: MetricsFilterState;
}

export function MetricsPanelProvider({
  children,
  onFiltersChange,
  defaultFilters = {},
}: MetricsPanelProviderProps) {
  // Built-in filters with nuqs
  const [range, setRange] = useQueryState('range', parseAsString.withDefault('now-6h'));
  const [step, setStep] = useQueryState('step', parseAsString.withDefault('1m'));
  const [refreshInterval, setRefreshInterval] = useQueryState(
    'refresh',
    parseAsString.withDefault('off')
  );

  // Dynamic filter state
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, FilterValue>>({});

  // Parse timeRange from range string
  const timeRange: TimeRange = useMemo(() => parseRange(range), [range]);

  // Query client for refresh functionality
  const queryClient = useQueryClient();

  // Combined filter state
  const filterState: MetricsFilterState = useMemo(
    () => ({
      timeRange,
      step,
      refreshInterval,
      ...defaultFilters,
      ...dynamicFilters,
    }),
    [timeRange, step, refreshInterval, defaultFilters, dynamicFilters]
  );

  // Filter actions
  const setFilter = useCallback(
    (key: string, value: FilterValue) => {
      // Handle built-in filters
      if (key === 'range') {
        setRange(value as string);
        return;
      }
      if (key === 'step') {
        setStep(value as string);
        return;
      }
      if (key === 'refreshInterval') {
        setRefreshInterval(value as string);
        return;
      }

      // Handle dynamic filters
      setDynamicFilters((prev) => ({ ...prev, [key]: value }));

      // Sync with URL for persistence
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (value != null && value !== '' && value !== undefined) {
          const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
          url.searchParams.set(key, serializedValue);
        } else {
          url.searchParams.delete(key);
        }
        window.history.replaceState({}, '', url.toString());
      }
    },
    [setRange, setStep, setRefreshInterval]
  );

  const getFilter = useCallback(
    <T = FilterValue,>(key: string): T => {
      return filterState[key] as T;
    },
    [filterState]
  );

  const resetFilter = useCallback(
    (key: string) => {
      setFilter(key, null);
    },
    [setFilter]
  );

  const resetAllFilters = useCallback(() => {
    // Reset built-in filters
    setRange('now-6h');
    setStep('1m');
    setRefreshInterval('off');

    // Reset dynamic filters
    setDynamicFilters({});

    // Clear URL params
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      // Keep only non-filter params
      const paramsToKeep = ['page', 'limit']; // Add other non-filter params as needed
      const newSearchParams = new URLSearchParams();

      paramsToKeep.forEach((param) => {
        const value = url.searchParams.get(param);
        if (value) newSearchParams.set(param, value);
      });

      url.search = newSearchParams.toString();
      window.history.replaceState({}, '', url.toString());
    }
  }, [setRange, setStep, setRefreshInterval]);

  // Filter utilities
  const hasActiveFilters = useCallback(() => {
    // Check if any non-default values are set
    const hasCustomRange = range !== 'now-6h';
    const hasCustomStep = step !== '1m';
    const hasCustomRefresh = refreshInterval !== 'off';
    const hasDynamicFilters = Object.values(dynamicFilters).some((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    });

    return hasCustomRange || hasCustomStep || hasCustomRefresh || hasDynamicFilters;
  }, [range, step, refreshInterval, dynamicFilters]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (range !== 'now-6h') count++;
    if (step !== '1m') count++;
    if (refreshInterval !== 'off') count++;

    count += Object.values(dynamicFilters).filter((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    }).length;

    return count;
  }, [range, step, refreshInterval, dynamicFilters]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['prometheus-api'] });
  }, [queryClient]);

  // Simple query builder helper
  const buildQuery = useCallback(
    (template: string, filters?: MetricsFilterState) => {
      const filtersToUse = filters || filterState;
      let query = template;

      // Replace template variables like {{key}} with filter values
      Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value != null && value !== '') {
          const placeholder = `{{${key}}}`;
          let replacement = '';

          if (Array.isArray(value)) {
            replacement = value.join('|');
          } else if (typeof value === 'object' && 'start' in value) {
            // Handle TimeRange objects
            replacement = ''; // TimeRange is handled separately
          } else {
            replacement = String(value);
          }

          query = query.replace(new RegExp(placeholder, 'g'), replacement);
        }
      });

      return query;
    },
    [filterState]
  );

  // Call onFiltersChange when filters change
  useEffect(() => {
    onFiltersChange?.(filterState);
  }, [filterState, onFiltersChange]);

  // Initialize dynamic filters from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlFilters: Record<string, FilterValue> = {};

      // Skip built-in filter params
      const builtInParams = ['range', 'step', 'refresh'];

      for (const [key, value] of urlParams.entries()) {
        if (!builtInParams.includes(key) && value && value.trim() !== '') {
          try {
            // Try to parse as JSON for complex values
            if (value.startsWith('[') || value.startsWith('{')) {
              urlFilters[key] = JSON.parse(value);
            } else {
              urlFilters[key] = value;
            }
          } catch {
            urlFilters[key] = value;
          }
        }
      }

      if (Object.keys(urlFilters).length > 0) {
        setDynamicFilters(urlFilters);
      }
    }
  }, []);

  const contextValue: MetricsPanelContextType = useMemo(
    () => ({
      // Built-in filter state
      timeRange,
      step,
      refreshInterval,

      // Dynamic filter state
      filterState,

      // Filter actions
      setFilter,
      getFilter,
      resetFilter,
      resetAllFilters,

      // Utilities
      hasActiveFilters,
      getActiveFilterCount,
      refresh,
      buildQuery,
    }),
    [
      timeRange,
      step,
      refreshInterval,
      filterState,
      setFilter,
      getFilter,
      resetFilter,
      resetAllFilters,
      hasActiveFilters,
      getActiveFilterCount,
      refresh,
      buildQuery,
    ]
  );

  return (
    <MetricsPanelContext.Provider value={contextValue}>{children}</MetricsPanelContext.Provider>
  );
}
