/**
 * Utility functions for building Prometheus queries with common filtering patterns
 */

export interface PrometheusLabelFilter {
  /** Label name in Prometheus */
  label: string;
  /** Filter value(s) - can be string, array of strings, or null/undefined */
  value: string | string[] | null | undefined;
}

export interface PrometheusQueryBuilderOptions {
  /** Base labels that are always included (automatically quoted) */
  baseLabels: Record<string, string>;
  /** Additional filters to apply */
  filters?: PrometheusLabelFilter[];
  /**
   * Custom label filters as key-value pairs
   * - Values starting with operators (!,=,~) are used as-is: `label!=""`
   * - Other values are automatically quoted: `label="value"`
   */
  customLabels?: Record<string, string>;
}

/**
 * Builds a Prometheus label selector string from the provided options
 *
 * @example
 * ```typescript
 * const selector = buildPrometheusLabelSelector({
 *   baseLabels: {
 *     resourcemanager_datumapis_com_project_name: 'project123',
 *     gateway_name: 'proxy456'
 *   },
 *   customLabels: {
 *     label_topology_kubernetes_io_region: '!=""', // Raw operator
 *     environment: 'production' // Auto-quoted
 *   },
 *   filters: [
 *     { label: 'label_topology_kubernetes_io_region', value: ['us-east-1', 'us-west-2'] }
 *   ]
 * });
 * // Result: {resourcemanager_datumapis_com_project_name="project123",gateway_name="proxy456",label_topology_kubernetes_io_region!="",environment="production",label_topology_kubernetes_io_region=~"us-east-1|us-west-2"}
 * ```
 */
export function buildPrometheusLabelSelector(options: PrometheusQueryBuilderOptions): string {
  const { baseLabels, filters = [], customLabels = {} } = options;
  const allLabels: string[] = [];

  // Add base labels
  Object.entries(baseLabels).forEach(([key, value]) => {
    allLabels.push(`${key}="${value}"`);
  });

  // Add custom labels (support raw operators)
  Object.entries(customLabels).forEach(([key, value]) => {
    // If value starts with an operator (!, =, ~), use it as-is
    if (value.match(/^[!~=]/)) {
      allLabels.push(`${key}${value}`);
    } else {
      allLabels.push(`${key}="${value}"`);
    }
  });

  // Add filtered labels
  filters.forEach(({ label, value }) => {
    if (value) {
      if (Array.isArray(value) && value.length > 0) {
        // Multiple values - use regex OR pattern
        const pattern = value.join('|');
        allLabels.push(`${label}=~"${pattern}"`);
      } else if (typeof value === 'string' && value.trim()) {
        // Single value - use exact match
        allLabels.push(`${label}="${value}"`);
      }
    }
  });

  return `{${allLabels.join(',')}}`;
}

/**
 * Creates a region filter for Prometheus queries
 *
 * @param regionValue - The region filter value from metrics context
 * @param regionLabel - The Prometheus label name for regions (default: 'label_topology_kubernetes_io_region')
 * @returns PrometheusLabelFilter object
 *
 * @example
 * ```typescript
 * const regionFilter = createRegionFilter(get('regions'));
 * const selector = buildPrometheusLabelSelector({
 *   baseLabels: { project: 'myproject' },
 *   filters: [regionFilter]
 * });
 * ```
 */
export function createRegionFilter(
  regionValue: string | string[] | null | undefined,
  regionLabel: string = 'label_topology_kubernetes_io_region'
): PrometheusLabelFilter {
  return {
    label: regionLabel,
    value: regionValue,
  };
}

/**
 * Builds a complete Prometheus query with rate function and common patterns
 *
 * @param options Configuration for the query
 * @returns Complete Prometheus query string
 *
 * @example
 * ```typescript
 * const query = buildRateQuery({
 *   metric: 'envoy_vhost_vcluster_upstream_rq',
 *   timeWindow: '5m',
 *   baseLabels: {
 *     'resourcemanager_datumapis_com_project_name': projectId,
 *     'gateway_name': proxyId
 *   },
 *   filters: [createRegionFilter(get('regions'))],
 *   groupBy: ['label_topology_kubernetes_io_region']
 * });
 * ```
 */
export function buildRateQuery(options: {
  metric: string;
  timeWindow: string;
  baseLabels: Record<string, string>;
  filters?: PrometheusLabelFilter[];
  customLabels?: Record<string, string>;
  groupBy?: string[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max';
}): string {
  const {
    metric,
    timeWindow,
    baseLabels,
    filters,
    customLabels,
    groupBy = [],
    aggregation = 'sum',
  } = options;

  const labelSelector = buildPrometheusLabelSelector({
    baseLabels,
    filters,
    customLabels,
  });

  const groupByClause = groupBy.length > 0 ? ` by (${groupBy.join(',')})` : '';

  return `${aggregation}(rate(${metric}${labelSelector}[${timeWindow}]))${groupByClause}`;
}

/**
 * Builds a histogram_quantile query with common patterns
 *
 * @example
 * ```typescript
 * const query = buildHistogramQuantileQuery({
 *   quantile: 0.99,
 *   metric: 'envoy_vhost_vcluster_upstream_rq_time_bucket',
 *   timeWindow: '5m',
 *   baseLabels: { project: 'myproject' },
 *   filters: [createRegionFilter(get('regions'))],
 *   groupBy: ['le', 'namespace']
 * });
 * ```
 */
export function buildHistogramQuantileQuery(options: {
  quantile: number;
  metric: string;
  timeWindow: string;
  baseLabels: Record<string, string>;
  filters?: PrometheusLabelFilter[];
  customLabels?: Record<string, string>;
  groupBy?: string[];
  aggregation?: 'sum' | 'avg' | 'min' | 'max';
}): string {
  const {
    quantile,
    metric,
    timeWindow,
    baseLabels,
    filters,
    customLabels,
    groupBy = [],
    aggregation = 'sum',
  } = options;

  const labelSelector = buildPrometheusLabelSelector({
    baseLabels,
    filters,
    customLabels,
  });

  const groupByClause = groupBy.length > 0 ? ` by (${groupBy.join(',')})` : '';

  return `histogram_quantile(${quantile}, ${aggregation}(rate(${metric}${labelSelector}[${timeWindow}]))${groupByClause})`;
}
