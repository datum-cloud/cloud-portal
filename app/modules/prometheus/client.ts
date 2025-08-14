/**
 * Prometheus HTTP client for query execution
 */
import { PrometheusError } from './errors';
import type {
  PrometheusConfig,
  PrometheusInstantQueryParams,
  PrometheusRangeQueryRawParams,
  PrometheusInstantResponse,
  PrometheusRangeResponse,
} from './types';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

export const PROMETHEUS_CONFIG: PrometheusConfig = {
  baseURL: '',
  timeout: 30000,
  retries: 3,
} as const;

/**
 * Creates and configures Prometheus HTTP client
 */
export function createPrometheusClient(config?: Partial<PrometheusConfig>): AxiosInstance {
  const mergedConfig = { ...PROMETHEUS_CONFIG, ...config };

  // if (!mergedConfig.baseURL) {
  //   throw new PrometheusError('PROMETHEUS_URL environment variable is required', 'network');
  // }

  const client = axios.create({
    baseURL: mergedConfig.baseURL,
    timeout: mergedConfig.timeout,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      ...mergedConfig.headers, // Merge custom headers from config
    },
  });

  // Request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      console.error('Prometheus Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling and logging
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      console.error('Prometheus Response Error:', error);

      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        throw PrometheusError.network(
          data?.error || `HTTP ${status} error`,
          status,
          data?.errorType
        );
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED') {
          throw PrometheusError.timeout('Request timeout');
        }
        throw PrometheusError.network('Network error - no response received');
      } else {
        // Something else happened
        throw PrometheusError.unknown(error.message);
      }
    }
  );

  return client;
}

/**
 * Execute instant query against Prometheus
 */
export async function executeInstantQuery(
  client: AxiosInstance,
  params: PrometheusInstantQueryParams
): Promise<PrometheusInstantResponse> {
  try {
    const response = await client.get('/api/v1/query', {
      params: {
        query: params.query,
        time: params.time,
      },
    });

    const data = response.data as PrometheusInstantResponse;

    if (data.status === 'error') {
      throw PrometheusError.query(data.error || 'Query execution failed', data.errorType);
    }

    return data;
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
 * Execute range query against Prometheus
 */
export async function executeRangeQuery(
  client: AxiosInstance,
  params: PrometheusRangeQueryRawParams
): Promise<PrometheusRangeResponse> {
  try {
    const response = await client.get('/api/v1/query_range', {
      params: {
        query: params.query,
        start: params.start,
        end: params.end,
        step: params.step,
      },
    });

    const data = response.data as PrometheusRangeResponse;

    if (data.status === 'error') {
      throw PrometheusError.query(data.error || 'Query execution failed', data.errorType);
    }

    return data;
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
 * Test Prometheus connection
 */
export async function testConnection(client: AxiosInstance): Promise<boolean> {
  try {
    const response = await client.get('/api/v1/query', {
      params: {
        query: 'up',
        time: Math.floor(Date.now() / 1000).toString(),
      },
    });

    return response.data?.status === 'success';
  } catch (error) {
    console.error('Prometheus connection test failed:', error);
    return false;
  }
}

/**
 * Get Prometheus build information
 */
export async function getBuildInfo(client: AxiosInstance): Promise<Record<string, string>> {
  try {
    const response = await client.get('/api/v1/status/buildinfo');

    if (response.data?.status === 'success') {
      return response.data.data || {};
    }

    return {};
  } catch (error) {
    console.error('Failed to get Prometheus build info:', error);
    return {};
  }
}
