import { urlSearchParamsBodySerializer } from '@/modules/control-plane/shared/client';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import type {
  PrometheusInstantResponse,
  PrometheusRangeResponse,
  PrometheusResponse,
} from '@/modules/prometheus/types';
import { getProjectScopedBase } from '@/resources/base/utils';
import { ValidationError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';

const SERVICE_NAME = 'O11yMetricsService';

export const O11Y_METRICS_API_PATH = '/apis/o11y.miloapis.com/v1alpha1/metrics/api/v1';
export const O11Y_METRICS_QUERY_PATH = `${O11Y_METRICS_API_PATH}/query`;
export const O11Y_METRICS_QUERY_RANGE_PATH = `${O11Y_METRICS_API_PATH}/query_range`;

export const o11yMetricsLabelValuesPath = (label: string): string =>
  `${O11Y_METRICS_API_PATH}/label/${encodeURIComponent(label)}/values`;

const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' } as const;

export interface O11yMetricsQueryParams {
  projectId: string;
  query: string;
  /** Unix seconds. queryapi defaults to now when omitted. */
  time?: number;
}

export interface O11yMetricsQueryRangeParams {
  projectId: string;
  query: string;
  /** Unix seconds. */
  start: number;
  /** Unix seconds. */
  end: number;
  /** Duration string, e.g. `15s`, `1m`. */
  step: string;
}

export interface O11yMetricsLabelValuesParams {
  projectId: string;
  label: string;
  /** Series selector that scopes the label values, e.g. `{job="api"}`. */
  match?: string;
}

interface PrometheusLabelValuesResponse extends Omit<PrometheusResponse, 'data'> {
  data?: string[];
}

type O11yMetricsClient = Pick<typeof client, 'get' | 'post'>;

/**
 * Throws on a Prometheus error envelope that arrived with a 2xx status.
 * Non-2xx responses already throw from the client and keep their HTTP status
 * through `mapApiError`.
 */
function assertSuccess<T extends { status: PrometheusResponse['status']; error?: string }>(
  body: T | undefined,
  fallback: string
): T {
  if (!body || body.status === 'error') {
    throw new ValidationError(body?.error || fallback);
  }
  return body;
}

/**
 * Project-scoped metric queries against telemetry queryapi's Prometheus-shaped
 * routes. Project tenancy is the control-plane base URL; queryapi enforces it
 * from the caller's token, so queries need no project label matcher.
 *
 * `query` and `query_range` must be form-encoded POSTs. Responses are returned
 * as the raw Prometheus envelope so the existing formatters apply unchanged.
 *
 * `client` is injectable so tests do not `mock.module` the shared control-plane
 * client (that mock is process-global in bun and would strip `getConfig` from
 * every other suite).
 */
export function createO11yMetricsService(deps: { client?: O11yMetricsClient } = {}) {
  const api = deps.client ?? client;

  const run = async <T>(
    operation: string,
    input: Record<string, unknown>,
    request: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    try {
      const result = await request();
      logger.service(SERVICE_NAME, operation, { input, duration: Date.now() - startTime });
      return result;
    } catch (error) {
      const mapped = mapApiError(error);
      logger.error(`${SERVICE_NAME}.${operation} failed`, mapped);
      throw mapped;
    }
  };

  return {
    async query(params: O11yMetricsQueryParams): Promise<PrometheusInstantResponse> {
      const { projectId, query, time } = params;

      return run('query', { projectId, query }, async () => {
        const response = await api.post({
          url: O11Y_METRICS_QUERY_PATH,
          baseURL: getProjectScopedBase(projectId),
          ...urlSearchParamsBodySerializer,
          headers: FORM_HEADERS,
          body: { query, time },
        });

        return assertSuccess(
          response.data as PrometheusInstantResponse | undefined,
          'Metric query failed'
        );
      });
    },

    async queryRange(params: O11yMetricsQueryRangeParams): Promise<PrometheusRangeResponse> {
      const { projectId, query, start, end, step } = params;

      return run('queryRange', { projectId, query, step }, async () => {
        const response = await api.post({
          url: O11Y_METRICS_QUERY_RANGE_PATH,
          baseURL: getProjectScopedBase(projectId),
          ...urlSearchParamsBodySerializer,
          headers: FORM_HEADERS,
          body: { query, start, end, step },
        });

        return assertSuccess(
          response.data as PrometheusRangeResponse | undefined,
          'Metric range query failed'
        );
      });
    },

    async labelValues(params: O11yMetricsLabelValuesParams): Promise<string[]> {
      const { projectId, label, match } = params;

      return run('labelValues', { projectId, label, match }, async () => {
        const response = await api.get({
          url: o11yMetricsLabelValuesPath(label),
          baseURL: getProjectScopedBase(projectId),
          query: match ? { 'match[]': match } : undefined,
        });

        const body = assertSuccess(
          response.data as PrometheusLabelValuesResponse | undefined,
          'Label values query failed'
        );
        return body.data ?? [];
      });
    },
  };
}

export type O11yMetricsService = ReturnType<typeof createO11yMetricsService>;
