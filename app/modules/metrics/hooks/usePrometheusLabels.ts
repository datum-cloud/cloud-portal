/**
 * Generic hook for fetching Prometheus labels with MultiSelect integration
 */
import { usePrometheusAPIQuery } from './usePrometheusApi';
import type { MultiSelectOption } from '@/components/multi-select/multi-select';
import { useMemo } from 'react';

export interface UsePrometheusLabelsOptions {
  /**
   * The label name to fetch values for (e.g., 'region', 'instance', 'job')
   */
  label: string;

  /**
   * Optional Prometheus series selector to scope label values (e.g. '{job="api"}')
   */
  match?: string;

  /**
   * Whether the query is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Transform function to customize label values
   * @param value - The raw label value from Prometheus
   * @returns The transformed label and value
   */
  transform?: (value: string) => { label: string; value: string };

  /**
   * Filter function to exclude certain label values
   * @param value - The raw label value from Prometheus
   * @returns true to include, false to exclude
   */
  filter?: (value: string) => boolean;

  /**
   * Sort function for the options
   * @default alphabetical by label
   */
  sort?: (a: MultiSelectOption, b: MultiSelectOption) => number;
}

export interface UsePrometheusLabelsResult {
  /** Array of options formatted for MultiSelect component */
  options: MultiSelectOption[];
  /** Raw label values from Prometheus */
  values: string[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data is being fetched */
  isFetching: boolean;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Hook to fetch Prometheus label values and format them for MultiSelect
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { options, isLoading } = usePrometheusLabels({ label: 'region' });
 *
 * // With custom transform
 * const { options } = usePrometheusLabels({
 *   label: 'instance',
 *   transform: (value) => ({
 *     label: value.split(':')[0], // Remove port from instance
 *     value
 *   })
 * });
 *
 * // With filtering
 * const { options } = usePrometheusLabels({
 *   label: 'job',
 *   filter: (value) => !value.startsWith('test-')
 * });
 * ```
 */
export function usePrometheusLabels({
  label,
  match,
  enabled = true,
  transform,
  filter,
  sort,
}: UsePrometheusLabelsOptions): UsePrometheusLabelsResult {
  const {
    data: values = [],
    isLoading,
    error,
    isFetching,
    refetch,
  } = usePrometheusAPIQuery<string[]>(
    ['prometheus-api', 'labels', label, match],
    {
      type: 'labels',
      label,
      ...(match && { match }),
    },
    { enabled }
  );

  const options = useMemo(() => {
    let filteredValues = values;

    // Apply filter if provided
    if (filter) {
      filteredValues = values.filter(filter);
    }

    // Transform values to options
    const transformedOptions: MultiSelectOption[] = filteredValues.map((value: string) => {
      if (transform) {
        const transformed = transform(value);
        return {
          label: transformed.label,
          value: transformed.value,
        };
      }

      return {
        label: value,
        value,
      };
    });

    // Apply sorting
    if (sort) {
      transformedOptions.sort(sort);
    } else {
      // Default alphabetical sort by label
      transformedOptions.sort((a, b) => a.label.localeCompare(b.label));
    }

    return transformedOptions;
  }, [values, transform, filter, sort]);

  return {
    options,
    values,
    isLoading,
    error,
    isFetching,
    refetch,
  };
}

/**
 * Predefined transform functions for common use cases
 */
export const labelTransforms = {
  /**
   * Remove port from instance labels (e.g., "host:9090" -> "host")
   */
  removePort: (value: string) => ({
    label: value.split(':')[0],
    value,
  }),

  /**
   * Capitalize first letter
   */
  capitalize: (value: string) => ({
    label: value.charAt(0).toUpperCase() + value.slice(1),
    value,
  }),

  /**
   * Replace underscores with spaces and capitalize
   */
  humanize: (value: string) => ({
    label: value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    value,
  }),

  /**
   * Extract region from instance or other complex labels
   */
  extractRegion: (value: string) => {
    const regionMatch = value.match(/([a-z]+-[a-z]+-\d+)/);
    return {
      label: regionMatch ? regionMatch[1] : value,
      value,
    };
  },
};

/**
 * Predefined filter functions for common use cases
 */
export const labelFilters = {
  /**
   * Exclude test environments
   */
  excludeTest: (value: string) => !value.toLowerCase().includes('test'),

  /**
   * Exclude development environments
   */
  excludeDev: (value: string) => !value.toLowerCase().includes('dev'),

  /**
   * Only production environments
   */
  productionOnly: (value: string) => value.toLowerCase().includes('prod'),

  /**
   * Exclude empty or invalid values
   */
  excludeEmpty: (value: string) => value.trim().length > 0 && value !== 'unknown',
};
