/**
 * Main Prometheus service orchestration
 */
import {
  createPrometheusClient,
  executeInstantQuery,
  executeRangeQuery,
  testConnection,
  getBuildInfo,
  PROMETHEUS_CONFIG,
  getLabels,
} from './client';
import { PrometheusError } from './errors';
import { formatForChart, formatForCard } from './formatter';
import type {
  PrometheusConfig,
  PrometheusQueryOptions,
  PrometheusInstantResponse,
  PrometheusRangeResponse,
  FormattedMetricData,
  MetricCardData,
  TimeRange,
  MetricFormat,
} from './types';
import { validateQueryOptions, timeRangeToUnix } from './validator';
import type { AxiosInstance } from 'axios';

export class PrometheusService {
  private client: AxiosInstance;
  private config: PrometheusConfig;

  constructor(config?: Partial<PrometheusConfig>) {
    this.config = { ...PROMETHEUS_CONFIG, ...config };
    this.client = createPrometheusClient(this.config);
  }

  /**
   * Handles various API requests by dispatching to the correct service method.
   */
  async handleAPIRequest(request: any): Promise<any> {
    const { type, ...params } = request;

    switch (type) {
      case 'chart': {
        const validatedOptions = validateQueryOptions(params);
        return this.queryForChart(validatedOptions);
      }
      case 'card': {
        const validatedOptions = validateQueryOptions(params);
        return this.queryForCard(validatedOptions.query, params.metricFormat || 'number');
      }
      case 'connection': {
        const isConnected = await this.testConnection();
        return { connected: isConnected };
      }
      case 'buildinfo': {
        return this.getBuildInfo();
      }
      case 'labels': {
        return this.getLabels(params.label, params.match);
      }
      default:
        throw new PrometheusError(`Unsupported query type: ${type}`, 'query');
    }
  }

  /**
   * Execute instant query
   */
  async queryInstant(query: string, time?: Date): Promise<PrometheusInstantResponse> {
    try {
      const params = {
        query,
        time: time ? Math.floor(time.getTime() / 1000).toString() : undefined,
      };

      return await executeInstantQuery(this.client, params);
    } catch (error) {
      if (error instanceof PrometheusError) {
        throw error;
      }
      throw PrometheusError.unknown(
        error instanceof Error ? error.message : 'Unknown error during instant query'
      );
    }
  }

  /**
   * Execute range query
   */
  async queryRange(
    query: string,
    timeRange: TimeRange,
    step: string = '15s'
  ): Promise<PrometheusRangeResponse> {
    try {
      const { start, end } = timeRangeToUnix(timeRange);

      const params = {
        query,
        start: start.toString(),
        end: end.toString(),
        step,
      };

      return await executeRangeQuery(this.client, params);
    } catch (error) {
      if (error instanceof PrometheusError) {
        throw error;
      }
      throw PrometheusError.unknown(
        error instanceof Error ? error.message : 'Unknown error during range query'
      );
    }
  }

  /**
   * Query and format data for charts
   */
  async queryForChart(options: PrometheusQueryOptions): Promise<FormattedMetricData> {
    const validatedOptions = validateQueryOptions(options);

    try {
      let response: PrometheusInstantResponse | PrometheusRangeResponse;
      let calculatedTimeRange: { start: number; end: number } | undefined;

      if (validatedOptions.timeRange) {
        // Range query for time series data
        const step = validatedOptions.step || this.calculateOptimalStep(validatedOptions.timeRange);
        response = await this.queryRange(validatedOptions.query, validatedOptions.timeRange, step);

        calculatedTimeRange = timeRangeToUnix(validatedOptions.timeRange);
      } else {
        // Instant query for current values
        response = await this.queryInstant(validatedOptions.query);
      }

      return formatForChart(response.data, calculatedTimeRange);
    } catch (error) {
      if (error instanceof PrometheusError) {
        throw error;
      }
      throw PrometheusError.unknown(
        error instanceof Error ? error.message : 'Unknown error during chart query'
      );
    }
  }

  /**
   * Query and format data for metric cards
   */
  async queryForCard(
    query: string,
    format: MetricFormat = 'number',
    time?: Date
  ): Promise<MetricCardData> {
    try {
      const response = await this.queryInstant(query, time);
      return formatForCard(response.data, format);
    } catch (error) {
      if (error instanceof PrometheusError) {
        throw error;
      }
      throw PrometheusError.unknown(
        error instanceof Error ? error.message : 'Unknown error during card query'
      );
    }
  }

  /**
   * Test connection to Prometheus
   */
  async testConnection(): Promise<boolean> {
    return await testConnection(this.client);
  }

  /**
   * Get Prometheus build information
   */
  async getBuildInfo(): Promise<Record<string, string>> {
    return await getBuildInfo(this.client);
  }

  /**
   * Get Prometheus labels information
   * @param match - Optional series selector to scope label values
   */
  async getLabels(label: string, match?: string): Promise<string[]> {
    return await getLabels(this.client, label, match);
  }

  /**
   * Calculate optimal step size based on time range
   */
  private calculateOptimalStep(timeRange: TimeRange): string {
    const durationMs = timeRange.end.getTime() - timeRange.start.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);

    // Aim for approximately 300-500 data points
    const targetPoints = 400;
    const stepSeconds = Math.max(15, Math.floor(durationSeconds / targetPoints));

    if (stepSeconds < 60) {
      return `${stepSeconds}s`;
    } else if (stepSeconds < 3600) {
      return `${Math.floor(stepSeconds / 60)}m`;
    } else if (stepSeconds < 86400) {
      return `${Math.floor(stepSeconds / 3600)}h`;
    } else {
      return `${Math.floor(stepSeconds / 86400)}d`;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): PrometheusConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PrometheusConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.client = createPrometheusClient(this.config);
  }
}

/**
 * Default Prometheus service instance
 */
export const prometheusService = new PrometheusService();
