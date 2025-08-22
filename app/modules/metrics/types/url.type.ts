/**
 * URL state management types for metrics module
 */
import { TimeRange } from '@/modules/prometheus';

/**
 * URL state entry stored in the registry
 */
export interface URLStateEntry {
  urlValue: any;
  setUrlValue: (value: any) => void;
  defaultValue: any;
  parser: any;
}

/**
 * URL state registry type
 */
export type URLStateRegistry = Map<string, URLStateEntry>;

/**
 * Custom API parameters for metric charts
 */
export interface CustomApiParamsObject {
  // Control selection
  timeRange?: string; // Use specific time range filterKey
  step?: string; // Use specific step filterKey

  // Any other parameters
  [key: string]: any;
}

/**
 * Custom API parameters - can be an object or function
 */
export type CustomApiParams =
  | CustomApiParamsObject
  | ((context: QueryBuilderContext) => CustomApiParamsObject);

/**
 * Enhanced query builder context with URL state access
 */
export interface QueryBuilderContext {
  // Default fallback values
  timeRange: TimeRange;
  step: string;

  // All registered URL state
  state: Record<string, any>;

  // Legacy compatibility - alias for state
  filters: Record<string, any>;

  // Utility functions
  get: <T = any>(key: string, defaultValue?: T) => T;
  has: (key: string) => boolean;
  getMany: (keys: string[]) => Record<string, any>;

  // Enhanced control access
  getTimeRange: (key: string) => TimeRange;
  getStep: (key: string) => string;
}

/**
 * Query builder function type with enhanced context
 */
export type QueryBuilderFunction = (context: QueryBuilderContext) => string;

/**
 * URL state management configuration
 */
export interface URLStateConfig {
  key: string;
  type: 'string' | 'array' | 'date' | 'dateRange' | 'number';
  defaultValue?: any;
}
