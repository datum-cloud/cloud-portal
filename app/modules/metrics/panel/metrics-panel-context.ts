import type { TimeRange } from '@/modules/prometheus';

// Types for dynamic filter state
export type FilterValue = string | string[] | number | boolean | Date | object | null | undefined;

export interface MetricsFilterState {
  // Built-in controls
  timeRange?: TimeRange;
  step?: string;
  refreshInterval?: string;

  // Dynamic custom filters
  [key: string]: FilterValue;
}

// Main context interface
export interface MetricsPanelContextType {
  // Built-in filter state
  timeRange: TimeRange;
  step: string;
  refreshInterval: string;

  // Dynamic filter state
  filterState: MetricsFilterState;

  // Filter actions
  setFilter: (key: string, value: FilterValue) => void;
  getFilter: <T = FilterValue>(key: string) => T;
  resetFilter: (key: string) => void;
  resetAllFilters: () => void;

  // Utilities
  hasActiveFilters: () => boolean;
  getActiveFilterCount: () => number;
  refresh: () => void;

  // Query helpers
  buildQuery: (template: string, filters?: MetricsFilterState) => string;
}
