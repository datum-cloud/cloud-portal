/**
 * Enhanced MetricsProvider with unified URL state management
 * All controls and filters use the same centralized URL registry pattern
 */
import type {
  FilterState,
  FilterValue,
  QueryBuilderContext,
} from '@/modules/metrics/types/metrics.type';
import type { URLStateRegistry } from '@/modules/metrics/types/url.type';
import { parseRange } from '@/modules/metrics/utils/date-parsers';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import type { TimeRange } from '@/modules/prometheus';
import { useQueryStates } from 'nuqs';
import React, { createContext, useContext, useMemo, useCallback, useState, useRef } from 'react';

// Enhanced context type with URL state management
interface EnhancedMetricsContextType {
  // Core Controls
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  step: string;
  setStep: (step: string) => void;
  refreshInterval: string;
  setRefreshInterval: (interval: string) => void;
  refresh: () => void;

  // Filter State (backward compatibility)
  filterState: FilterState;
  setFilter: (key: string, value: FilterValue) => void;
  resetFilter: (key: string) => void;
  resetAllFilters: () => void;
  getFilterValue: <T = FilterValue>(key: string) => T;
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;

  // URL state management
  registerUrlState: (key: string, type: string, defaultValue: any) => void;
  getUrlState: (key: string) => any;
  setUrlState: (key: string, value: any) => void;
  hasUrlState: (key: string) => boolean;
  updateUrlStateEntry: (key: string, urlValue: any, setUrlValue: (value: any) => void) => void;

  // Enhanced query builder
  buildQueryContext: () => QueryBuilderContext;
}

// Create the context
export const MetricsContext = createContext<EnhancedMetricsContextType | null>(null);

// Provider props
export interface MetricsProviderProps {
  children: React.ReactNode;
  defaultTimeRange?: string;
  defaultStep?: string;
  defaultRefreshInterval?: string;
  defaultFilters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  onCoreControlsChange?: (controls: {
    timeRange: TimeRange;
    step: string;
    refreshInterval: string;
  }) => void;
}

export function MetricsProvider({
  children,
  defaultTimeRange = 'now-1h',
  defaultStep = '1m',
  defaultRefreshInterval = 'off',
  defaultFilters = {},
  onFiltersChange,
  onCoreControlsChange,
}: MetricsProviderProps): React.JSX.Element {
  // Centralized URL state registry
  const urlStateRegistry = useRef<URLStateRegistry>(new Map());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Direct URL state reading for core controls (immediate initialization)
  const [coreUrlStates] = useQueryStates({
    timeRange: createMetricsParser('string', defaultTimeRange),
    step: createMetricsParser('string', defaultStep),
    refresh: createMetricsParser('string', defaultRefreshInterval),
  });

  // URL state management functions
  const registerUrlState = useCallback((key: string, type: string, defaultValue: any) => {
    if (!urlStateRegistry.current.has(key)) {
      const parser = createMetricsParser(type as any, defaultValue);
      // Note: useQueryState calls will be handled by individual components
      // This is just for registration tracking
      urlStateRegistry.current.set(key, {
        urlValue: defaultValue,
        setUrlValue: () => {}, // Will be set by component
        defaultValue,
        parser,
      });
    }
  }, []);

  const getUrlState = useCallback((key: string) => {
    return urlStateRegistry.current.get(key)?.urlValue;
  }, []);

  const setUrlState = useCallback((key: string, value: any) => {
    const entry = urlStateRegistry.current.get(key);
    if (entry?.setUrlValue) {
      entry.setUrlValue(value);
    }
  }, []);

  const hasUrlState = useCallback((key: string) => {
    return urlStateRegistry.current.has(key);
  }, []);

  // Update URL state entry with actual hooks (called by components)
  const updateUrlStateEntry = useCallback(
    (key: string, urlValue: any, setUrlValue: (value: any) => void) => {
      const entry = urlStateRegistry.current.get(key);
      if (entry) {
        const previousValue = entry.urlValue;
        entry.urlValue = urlValue;
        entry.setUrlValue = setUrlValue;

        // Trigger refresh if value changed to update filter state
        if (previousValue !== urlValue) {
          setRefreshTrigger((prev) => prev + 1);
        }
      }
    },
    [setRefreshTrigger]
  );

  // Enhanced getUrlState that supports both core and custom URL parameters
  const getUrlStateEnhanced = useCallback(
    (key: string) => {
      // Check if it's a core control first
      if (key === 'timeRange') return coreUrlStates.timeRange;
      if (key === 'step') return coreUrlStates.step;
      if (key === 'refresh') return coreUrlStates.refresh;

      // For custom controls, get from registry
      const entry = urlStateRegistry.current.get(key);
      return entry?.urlValue;
    },
    [coreUrlStates.timeRange, coreUrlStates.step, coreUrlStates.refresh]
  );

  // Compute current values from direct URL state (fixes initialization issue)
  const currentTimeRange = useMemo(() => {
    const timeRangeValue = (coreUrlStates.timeRange as string) || defaultTimeRange;
    return parseRange(timeRangeValue);
  }, [coreUrlStates.timeRange, defaultTimeRange]);

  const currentStep = useMemo(() => {
    return (coreUrlStates.step as string) || defaultStep;
  }, [coreUrlStates.step, defaultStep]);

  const currentRefreshInterval = useMemo(() => {
    return (coreUrlStates.refresh as string) || defaultRefreshInterval;
  }, [coreUrlStates.refresh, defaultRefreshInterval]);

  // Legacy setters for backward compatibility
  const setTimeRange = useCallback(
    (newTimeRange: TimeRange) => {
      const rangeString = `${newTimeRange.start.toISOString()}_${newTimeRange.end.toISOString()}`;
      setUrlState('timeRange', rangeString);
      onCoreControlsChange?.({
        timeRange: newTimeRange,
        step: currentStep,
        refreshInterval: currentRefreshInterval,
      });
    },
    [setUrlState, currentStep, currentRefreshInterval, onCoreControlsChange]
  );

  const setStepValue = useCallback(
    (newStep: string) => {
      setUrlState('step', newStep);
      onCoreControlsChange?.({
        timeRange: currentTimeRange,
        step: newStep,
        refreshInterval: currentRefreshInterval,
      });
    },
    [setUrlState, currentTimeRange, currentRefreshInterval, onCoreControlsChange]
  );

  const setRefreshIntervalValue = useCallback(
    (newRefreshInterval: string) => {
      setUrlState('refresh', newRefreshInterval);
      onCoreControlsChange?.({
        timeRange: currentTimeRange,
        step: currentStep,
        refreshInterval: newRefreshInterval,
      });
    },
    [setUrlState, currentTimeRange, currentStep, onCoreControlsChange]
  );

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Current filter state from URL registry - include refreshTrigger to force updates
  const currentFilterState = useMemo(() => {
    const state: FilterState = {};
    for (const [key, entry] of urlStateRegistry.current.entries()) {
      if (key !== 'timeRange' && key !== 'step' && key !== 'refresh') {
        // Only include non-null/undefined values to properly track active filters
        const value = entry.urlValue;
        if (value !== null && value !== undefined && value !== '') {
          state[key] = value;
        }
      }
    }
    return { ...defaultFilters, ...state };
  }, [defaultFilters, refreshTrigger]);

  // Filter actions using URL state
  const setFilter = useCallback(
    (key: string, value: FilterValue) => {
      setUrlState(key, value);
      const newState = { ...currentFilterState, [key]: value };
      onFiltersChange?.(newState);
    },
    [setUrlState, currentFilterState, onFiltersChange]
  );

  const resetFilter = useCallback(
    (key: string) => {
      setUrlState(key, null);
      const newState = { ...currentFilterState };
      delete newState[key];
      onFiltersChange?.(newState);
    },
    [setUrlState, currentFilterState, onFiltersChange]
  );

  const resetAllFilters = useCallback(() => {
    // Reset all non-core control filters
    for (const key of urlStateRegistry.current.keys()) {
      if (key !== 'timeRange' && key !== 'step' && key !== 'refresh') {
        setUrlState(key, null);
      }
    }
    onFiltersChange?.({});
  }, [setUrlState, onFiltersChange]);

  // Filter utilities using URL state
  const getFilterValue = useCallback(
    <T = FilterValue,>(key: string): T => {
      return getUrlState(key) as T;
    },
    [getUrlState]
  );

  const hasActiveFilters = useCallback(() => {
    return Object.values(currentFilterState).some((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value instanceof Date) return true;
      if (typeof value === 'object' && 'from' in value) {
        return Boolean(value.from || (value as { to?: unknown }).to);
      }
      return Boolean(value);
    });
  }, [currentFilterState]);

  const getActiveFilterCount = useCallback(() => {
    return Object.values(currentFilterState).filter((value) => {
      if (value === null || value === undefined || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      if (value instanceof Date) return true;
      if (typeof value === 'object' && 'from' in value) {
        return Boolean(value.from || (value as { to?: unknown }).to);
      }
      return Boolean(value);
    }).length;
  }, [currentFilterState]);

  // Enhanced query builder context that supports all URL state (core + custom)
  const buildQueryContext = useCallback((): QueryBuilderContext => {
    const allState: Record<string, any> = {};

    // Add core controls
    allState.timeRange = coreUrlStates.timeRange;
    allState.step = coreUrlStates.step;
    allState.refresh = coreUrlStates.refresh;

    // Add custom controls from registry - ensure we get current values
    for (const [key, entry] of urlStateRegistry.current.entries()) {
      if (!allState[key]) {
        // Don't override core controls
        // Get the actual current value from the URL state hook
        const currentValue = entry.urlValue;
        if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
          allState[key] = currentValue;
        }
      }
    }

    return {
      timeRange: currentTimeRange,
      step: currentStep,
      state: allState,
      filters: allState, // Legacy compatibility alias
      get: <T = any,>(key: string, defaultValue?: T) => {
        const value = getUrlStateEnhanced(key);
        return value !== undefined && value !== null ? value : defaultValue;
      },
      has: (key: string) => hasUrlState(key) || ['timeRange', 'step', 'refresh'].includes(key),
      getMany: (keys: string[]) => {
        const result: Record<string, any> = {};
        keys.forEach((key) => {
          result[key] = getUrlStateEnhanced(key);
        });
        return result;
      },
      getTimeRange: (key: string) => parseRange(getUrlStateEnhanced(key) || 'now-1h'),
      getStep: (key: string) => getUrlStateEnhanced(key) || '1m',
    };
  }, [
    currentTimeRange,
    currentStep,
    getUrlStateEnhanced,
    hasUrlState,
    coreUrlStates,
    refreshTrigger,
  ]);

  // Memoize enhanced context value
  const contextValue = useMemo(
    (): EnhancedMetricsContextType => ({
      // Core Controls (backward compatibility)
      timeRange: currentTimeRange,
      setTimeRange,
      step: currentStep,
      setStep: setStepValue,
      refreshInterval: currentRefreshInterval,
      setRefreshInterval: setRefreshIntervalValue,
      refresh,

      // Filter State (backward compatibility)
      filterState: currentFilterState,
      setFilter,
      resetFilter,
      resetAllFilters,
      getFilterValue,
      hasActiveFilters,
      getActiveFilterCount,

      // Enhanced URL state management
      registerUrlState,
      updateUrlStateEntry,
      getUrlState: getUrlStateEnhanced,
      setUrlState,
      hasUrlState,
      buildQueryContext,
    }),
    [
      currentTimeRange,
      setTimeRange,
      currentStep,
      setStepValue,
      currentRefreshInterval,
      setRefreshIntervalValue,
      refresh,
      currentFilterState,
      setFilter,
      resetFilter,
      resetAllFilters,
      getFilterValue,
      hasActiveFilters,
      getActiveFilterCount,
      registerUrlState,
      getUrlState,
      setUrlState,
      hasUrlState,
      updateUrlStateEntry,
      buildQueryContext,
      refreshTrigger,
    ]
  );

  return <MetricsContext.Provider value={contextValue}>{children}</MetricsContext.Provider>;
}

// Main hook for accessing the enhanced context
export function useMetrics(): EnhancedMetricsContextType {
  const context = useContext(MetricsContext);

  if (!context) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }

  return context;
}
