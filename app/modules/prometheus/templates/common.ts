/**
 * Common Prometheus query templates
 */

export interface TemplateParams {
  interval?: string;
  filters?: Record<string, string>;
  groupBy?: string[];
}

/**
 * Common metric query templates
 */
export const CommonTemplates = {
  /**
   * Rate query template
   */
  rate: (metric: string, params: TemplateParams = {}): string => {
    const { interval = '5m', filters = {}, groupBy = [] } = params;
    let query = `rate(${metric}[${interval}])`;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query = `rate(${metric}{${filterStr}}[${interval}])`;
    }

    if (groupBy.length > 0) {
      query = `sum by (${groupBy.join(',')}) (${query})`;
    }

    return query;
  },

  /**
   * Increase query template
   */
  increase: (metric: string, params: TemplateParams = {}): string => {
    const { interval = '5m', filters = {}, groupBy = [] } = params;
    let query = `increase(${metric}[${interval}])`;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query = `increase(${metric}{${filterStr}}[${interval}])`;
    }

    if (groupBy.length > 0) {
      query = `sum by (${groupBy.join(',')}) (${query})`;
    }

    return query;
  },

  /**
   * Average query template
   */
  avg: (metric: string, params: TemplateParams = {}): string => {
    const { filters = {}, groupBy = [] } = params;
    let query = metric;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query = `${metric}{${filterStr}}`;
    }

    if (groupBy.length > 0) {
      query = `avg by (${groupBy.join(',')}) (${query})`;
    } else {
      query = `avg(${query})`;
    }

    return query;
  },

  /**
   * Sum query template
   */
  sum: (metric: string, params: TemplateParams = {}): string => {
    const { filters = {}, groupBy = [] } = params;
    let query = metric;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query = `${metric}{${filterStr}}`;
    }

    if (groupBy.length > 0) {
      query = `sum by (${groupBy.join(',')}) (${query})`;
    } else {
      query = `sum(${query})`;
    }

    return query;
  },

  /**
   * Maximum query template
   */
  max: (metric: string, params: TemplateParams = {}): string => {
    const { filters = {}, groupBy = [] } = params;
    let query = metric;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query = `${metric}{${filterStr}}`;
    }

    if (groupBy.length > 0) {
      query = `max by (${groupBy.join(',')}) (${query})`;
    } else {
      query = `max(${query})`;
    }

    return query;
  },

  /**
   * Minimum query template
   */
  min: (metric: string, params: TemplateParams = {}): string => {
    const { filters = {}, groupBy = [] } = params;
    let query = metric;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query = `${metric}{${filterStr}}`;
    }

    if (groupBy.length > 0) {
      query = `min by (${groupBy.join(',')}) (${query})`;
    } else {
      query = `min(${query})`;
    }

    return query;
  },

  /**
   * Histogram quantile template
   */
  quantile: (quantile: number, metric: string, params: TemplateParams = {}): string => {
    const { interval = '5m', filters = {}, groupBy = [] } = params;
    let bucketMetric = `${metric}_bucket`;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      bucketMetric = `${metric}_bucket{${filterStr}}`;
    }

    let query = `rate(${bucketMetric}[${interval}])`;

    if (groupBy.length > 0) {
      query = `sum by (le,${groupBy.join(',')}) (${query})`;
      return `histogram_quantile(${quantile}, ${query})`;
    } else {
      query = `sum by (le) (${query})`;
      return `histogram_quantile(${quantile}, ${query})`;
    }
  },

  /**
   * Error rate template
   */
  errorRate: (totalMetric: string, errorMetric: string, params: TemplateParams = {}): string => {
    const { interval = '5m', filters = {} } = params;

    const totalQuery = CommonTemplates.rate(totalMetric, { interval, filters });
    const errorQuery = CommonTemplates.rate(errorMetric, { interval, filters });

    return `(${errorQuery}) / (${totalQuery}) * 100`;
  },

  /**
   * Availability template (uptime percentage)
   */
  availability: (upMetric: string = 'up', params: TemplateParams = {}): string => {
    const { filters = {}, groupBy = [] } = params;
    let query = upMetric;

    if (Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query = `${upMetric}{${filterStr}}`;
    }

    if (groupBy.length > 0) {
      query = `avg by (${groupBy.join(',')}) (${query}) * 100`;
    } else {
      query = `avg(${query}) * 100`;
    }

    return query;
  },

  /**
   * Memory usage percentage template
   */
  memoryUsagePercent: (params: TemplateParams = {}): string => {
    const { filters = {}, groupBy = [] } = params;
    let filterStr = '';

    if (Object.keys(filters).length > 0) {
      filterStr = `{${Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')}}`;
    }

    const usedQuery = `node_memory_MemTotal_bytes${filterStr} - node_memory_MemAvailable_bytes${filterStr}`;
    const totalQuery = `node_memory_MemTotal_bytes${filterStr}`;

    let query = `(${usedQuery}) / (${totalQuery}) * 100`;

    if (groupBy.length > 0) {
      query = `(${usedQuery}) / (${totalQuery}) * 100`;
    }

    return query;
  },

  /**
   * CPU usage percentage template
   */
  cpuUsagePercent: (params: TemplateParams = {}): string => {
    const { interval = '5m', filters = {}, groupBy = [] } = params;
    let filterStr = '';

    if (Object.keys(filters).length > 0) {
      filterStr = `{${Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')}}`;
    }

    let query = `(1 - avg by (instance) (rate(node_cpu_seconds_total${filterStr}[${interval}]))) * 100`;

    if (groupBy.length > 0 && !groupBy.includes('instance')) {
      query = `(1 - avg by (${['instance', ...groupBy].join(',')}) (rate(node_cpu_seconds_total${filterStr}[${interval}]))) * 100`;
    }

    return query;
  },

  /**
   * Disk usage percentage template
   */
  diskUsagePercent: (params: TemplateParams = {}): string => {
    const { filters = {}, groupBy = [] } = params;
    let filterStr = '';

    if (Object.keys(filters).length > 0) {
      filterStr = `{${Object.entries(filters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')}}`;
    }

    const usedQuery = `node_filesystem_size_bytes${filterStr} - node_filesystem_avail_bytes${filterStr}`;
    const totalQuery = `node_filesystem_size_bytes${filterStr}`;

    let query = `(${usedQuery}) / (${totalQuery}) * 100`;

    if (groupBy.length > 0) {
      // Group by is handled in the metric labels
      query = `(${usedQuery}) / (${totalQuery}) * 100`;
    }

    return query;
  },
};
