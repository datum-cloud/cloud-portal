/**
 * Enhanced type definitions for the Metrics module
 */

// Filter value types (similar to data-table)
export type FilterValue = string | string[] | Date | { from?: Date; to?: Date } | null | undefined;

export interface FilterState {
  [key: string]: FilterValue;
}

// Re-export from url-types for consistency
export type { QueryBuilderContext, QueryBuilderFunction } from './url.type';

// Filter option interface
export interface FilterOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}
