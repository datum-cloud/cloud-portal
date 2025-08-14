/**
 * PromQL query construction utilities
 */
import type { QueryBuilderOptions } from './types';
import { validateQueryBuilderOptions, sanitizeQuery } from './validator';

export class PrometheusQueryBuilder {
  private metricName: string = '';
  private labelFilters: Record<string, string> = {};
  private functions: string[] = [];
  private groupByLabels: string[] = [];
  private aggregationFunction?: string;

  /**
   * Set the metric name
   */
  metric(name: string): PrometheusQueryBuilder {
    this.metricName = name;
    return this;
  }

  /**
   * Add label filters
   */
  filter(filters: Record<string, string>): PrometheusQueryBuilder {
    this.labelFilters = { ...this.labelFilters, ...filters };
    return this;
  }

  /**
   * Add a single label filter
   */
  where(label: string, value: string): PrometheusQueryBuilder {
    this.labelFilters[label] = value;
    return this;
  }

  /**
   * Add rate function
   */
  rate(interval: string = '5m'): PrometheusQueryBuilder {
    this.functions.push(`rate[${interval}]`);
    return this;
  }

  /**
   * Add increase function
   */
  increase(interval: string = '5m'): PrometheusQueryBuilder {
    this.functions.push(`increase[${interval}]`);
    return this;
  }

  /**
   * Add sum aggregation
   */
  sum(): PrometheusQueryBuilder {
    this.aggregationFunction = 'sum';
    return this;
  }

  /**
   * Add avg aggregation
   */
  avg(): PrometheusQueryBuilder {
    this.aggregationFunction = 'avg';
    return this;
  }

  /**
   * Add max aggregation
   */
  max(): PrometheusQueryBuilder {
    this.aggregationFunction = 'max';
    return this;
  }

  /**
   * Add min aggregation
   */
  min(): PrometheusQueryBuilder {
    this.aggregationFunction = 'min';
    return this;
  }

  /**
   * Add count aggregation
   */
  count(): PrometheusQueryBuilder {
    this.aggregationFunction = 'count';
    return this;
  }

  /**
   * Group by labels
   */
  groupBy(labels: string[]): PrometheusQueryBuilder {
    this.groupByLabels = [...labels];
    return this;
  }

  /**
   * Build the final PromQL query
   */
  build(): string {
    if (!this.metricName) {
      throw new Error('Metric name is required');
    }

    let query = this.metricName;

    // Add label filters
    if (Object.keys(this.labelFilters).length > 0) {
      const filters = Object.entries(this.labelFilters)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      query += `{${filters}}`;
    }

    // Apply functions (like rate, increase)
    for (const func of this.functions) {
      if (func.includes('[')) {
        // Functions with time intervals
        const [funcName, interval] = func.split('[');
        query = `${funcName}(${query}[${interval}`;
      } else {
        // Simple functions
        query = `${func}(${query})`;
      }
    }

    // Apply aggregation
    if (this.aggregationFunction) {
      if (this.groupByLabels.length > 0) {
        const groupBy = this.groupByLabels.join(',');
        query = `${this.aggregationFunction} by (${groupBy}) (${query})`;
      } else {
        query = `${this.aggregationFunction}(${query})`;
      }
    }

    return sanitizeQuery(query);
  }

  /**
   * Reset the builder
   */
  reset(): PrometheusQueryBuilder {
    this.metricName = '';
    this.labelFilters = {};
    this.functions = [];
    this.groupByLabels = [];
    this.aggregationFunction = undefined;
    return this;
  }

  /**
   * Create a new builder from options
   */
  static fromOptions(options: QueryBuilderOptions): PrometheusQueryBuilder {
    const validatedOptions = validateQueryBuilderOptions(options);
    const builder = new PrometheusQueryBuilder();

    builder.metric(validatedOptions.metric);

    if (validatedOptions.filters) {
      builder.filter(validatedOptions.filters);
    }

    if (validatedOptions.groupBy) {
      builder.groupBy(validatedOptions.groupBy);
    }

    if (validatedOptions.aggregation) {
      switch (validatedOptions.aggregation) {
        case 'sum':
          builder.sum();
          break;
        case 'avg':
          builder.avg();
          break;
        case 'max':
          builder.max();
          break;
        case 'min':
          builder.min();
          break;
        case 'count':
          builder.count();
          break;
      }
    }

    if (validatedOptions.functions) {
      for (const func of validatedOptions.functions) {
        if (func.startsWith('rate')) {
          const interval = func.match(/\[([^\]]+)\]/)?.[1] || '5m';
          builder.rate(interval);
        } else if (func.startsWith('increase')) {
          const interval = func.match(/\[([^\]]+)\]/)?.[1] || '5m';
          builder.increase(interval);
        }
      }
    }

    return builder;
  }
}

/**
 * Utility functions for common PromQL patterns
 */
export const PromQLUtils = {
  /**
   * Create a rate query
   */
  rate: (metric: string, interval: string = '5m', filters?: Record<string, string>): string => {
    const builder = new PrometheusQueryBuilder().metric(metric).rate(interval);
    if (filters) {
      builder.filter(filters);
    }
    return builder.build();
  },

  /**
   * Create an increase query
   */
  increase: (metric: string, interval: string = '5m', filters?: Record<string, string>): string => {
    const builder = new PrometheusQueryBuilder().metric(metric).increase(interval);
    if (filters) {
      builder.filter(filters);
    }
    return builder.build();
  },

  /**
   * Create an average query
   */
  avg: (metric: string, groupBy?: string[], filters?: Record<string, string>): string => {
    const builder = new PrometheusQueryBuilder().metric(metric).avg();
    if (filters) {
      builder.filter(filters);
    }
    if (groupBy) {
      builder.groupBy(groupBy);
    }
    return builder.build();
  },

  /**
   * Create a sum query
   */
  sum: (metric: string, groupBy?: string[], filters?: Record<string, string>): string => {
    const builder = new PrometheusQueryBuilder().metric(metric).sum();
    if (filters) {
      builder.filter(filters);
    }
    if (groupBy) {
      builder.groupBy(groupBy);
    }
    return builder.build();
  },

  /**
   * Create a histogram quantile query
   */
  quantile: (
    quantile: number,
    metric: string,
    interval: string = '5m',
    groupBy?: string[]
  ): string => {
    let query = `histogram_quantile(${quantile}, rate(${metric}_bucket[${interval}]))`;
    if (groupBy && groupBy.length > 0) {
      query = `histogram_quantile(${quantile}, sum by (${groupBy.join(',')}) (rate(${metric}_bucket[${interval}])))`;
    }
    return sanitizeQuery(query);
  },

  /**
   * Create a percentage query
   */
  percentage: (numerator: string, denominator: string): string => {
    return sanitizeQuery(`(${numerator}) / (${denominator}) * 100`);
  },

  /**
   * Create an error rate query
   */
  errorRate: (
    totalMetric: string,
    errorMetric: string,
    interval: string = '5m',
    filters?: Record<string, string>
  ): string => {
    const totalQuery = PromQLUtils.rate(totalMetric, interval, filters);
    const errorQuery = PromQLUtils.rate(errorMetric, interval, filters);
    return sanitizeQuery(`(${errorQuery}) / (${totalQuery}) * 100`);
  },
};
