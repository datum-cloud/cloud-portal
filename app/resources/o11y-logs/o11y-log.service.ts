import { toLogEntries } from './o11y-log.adapter';
import type { LogLabelCount } from './o11y-log.helpers';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { ValidationError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';
import type { LogEntry, LokiQueryRangeResponse } from '@datum-cloud/datum-ui/logs';

const SERVICE_NAME = 'O11yLogService';

export const O11Y_LOGS_QUERY_RANGE_PATH =
  '/apis/o11y.miloapis.com/v1alpha1/logs/loki/api/v1/query_range';

/** Instant queries; queryapi answers `sum by (...) (count_over_time(...))` here. */
export const O11Y_LOGS_QUERY_PATH = '/apis/o11y.miloapis.com/v1alpha1/logs/loki/api/v1/query';

/** Distinct values of one label; `{name}` is filled per call. */
export const O11Y_LOGS_LABEL_VALUES_PATH =
  '/apis/o11y.miloapis.com/v1alpha1/logs/loki/api/v1/label/{name}/values';

export const o11yLogKeys = {
  all: ['o11y-logs'] as const,
  labelValues: (projectId: string, query: string, name: string, windowKey: string) =>
    [...o11yLogKeys.all, 'label-values', projectId, query, name, windowKey] as const,
  labelCounts: (projectId: string, proxyId: string, query: string, windowKey: string) =>
    [...o11yLogKeys.all, 'label-counts', projectId, proxyId, query, windowKey] as const,
  queryRange: (
    projectId: string,
    proxyId: string,
    query: string,
    windowKey: string,
    limit: number
  ) => [...o11yLogKeys.all, 'query-range', projectId, proxyId, query, windowKey, limit] as const,
};

export type O11yLogDirection = 'backward' | 'forward';

export interface O11yLogQueryRangeParams {
  projectId: string;
  query: string;
  start: string;
  end: string;
  limit?: number;
  direction?: O11yLogDirection;
}

export interface O11yLogLabelValuesParams {
  projectId: string;
  /** Label name, underscored the way `/labels` advertises it (e.g. `response_code`). */
  name: string;
  /** Label-matcher selector scoping which streams count, e.g. `{route_name=~"…"}`. */
  query?: string;
  start: string;
  end: string;
}

export interface O11yLogCountParams {
  projectId: string;
  /** A `sum by (...) (count_over_time(<selector> [<range>]))` query. */
  query: string;
  /** End of the counted window (RFC 3339); the range in `query` reaches back from it. */
  time: string;
}

/** Loki's instant-vector envelope: one sample per group, the count as a string. */
interface LokiVectorResponse {
  status: 'success' | 'error';
  data?: {
    resultType?: string;
    result?: Array<{ metric?: Record<string, string>; value?: [number, string] }>;
  };
  error?: string;
}

/** Loki's string-list envelope for `/labels` and `/label/{name}/values`. */
interface LokiStringListResponse {
  status: 'success' | 'error';
  data?: string[];
  error?: string;
}

type O11yLogClient = Pick<typeof client, 'get'>;

/**
 * Tenant-scoped log queries against telemetry queryapi's Loki-shaped routes.
 * Project tenancy is the control-plane base URL; queryapi never takes a
 * client-supplied project id.
 *
 * `client` is injectable so tests pass a spy instead of mocking the shared
 * control-plane client, whose `getConfig` the scoped-base helpers rely on.
 */
export function createO11yLogService(deps: { client?: O11yLogClient } = {}) {
  const api = deps.client ?? client;

  return {
    async queryRange(params: O11yLogQueryRangeParams): Promise<LogEntry[]> {
      const startTime = Date.now();
      const { projectId, query, start, end, limit = 100, direction = 'backward' } = params;

      try {
        const response = await api.get({
          url: O11Y_LOGS_QUERY_RANGE_PATH,
          baseURL: getProjectScopedBase(projectId),
          query: { query, start, end, limit, direction },
        });

        const body = response.data as LokiQueryRangeResponse | undefined;
        if (body?.status === 'error') {
          throw new ValidationError(body.error || 'Log query failed');
        }

        const entries = toLogEntries(
          body ?? { status: 'success', data: { resultType: 'streams', result: [] } }
        );

        logger.service(SERVICE_NAME, 'queryRange', {
          input: { projectId, query, limit, itemCount: entries.length },
          duration: Date.now() - startTime,
        });

        return entries;
      } catch (error) {
        const mapped = mapApiError(error);
        logger.error(`${SERVICE_NAME}.queryRange failed`, mapped);
        throw mapped;
      }
    },

    /**
     * Lines per label group for a `sum by (...) (count_over_time(...))`
     * query. A group's labels leave out any the lines didn't have.
     */
    async countByLabels(params: O11yLogCountParams): Promise<LogLabelCount[]> {
      const startTime = Date.now();
      const { projectId, query, time } = params;

      try {
        const response = await api.get({
          url: O11Y_LOGS_QUERY_PATH,
          baseURL: getProjectScopedBase(projectId),
          query: { query, time },
        });

        const body = response.data as LokiVectorResponse | undefined;
        if (body?.status === 'error') {
          throw new ValidationError(body.error || 'Log count query failed');
        }
        const groups = (body?.data?.result ?? []).flatMap((sample) => {
          const count = Number(sample.value?.[1]);
          if (!Number.isFinite(count) || count <= 0) return [];
          return [{ labels: { ...sample.metric }, count }];
        });

        logger.service(SERVICE_NAME, 'countByLabels', {
          input: { projectId, query, itemCount: groups.length },
          duration: Date.now() - startTime,
        });

        return groups;
      } catch (error) {
        const mapped = mapApiError(error);
        logger.error(`${SERVICE_NAME}.countByLabels failed`, mapped);
        throw mapped;
      }
    },

    /**
     * Every distinct value of one label in the window, so a facet lists its
     * options independently of what the user has ticked. Counts come from
     * `countByLabels`.
     */
    async labelValues(params: O11yLogLabelValuesParams): Promise<string[]> {
      const startTime = Date.now();
      const { projectId, name, query, start, end } = params;

      try {
        const response = await api.get({
          url: O11Y_LOGS_LABEL_VALUES_PATH.replace('{name}', encodeURIComponent(name)),
          baseURL: getProjectScopedBase(projectId),
          query: query ? { query, start, end } : { start, end },
        });

        const body = response.data as LokiStringListResponse | undefined;
        if (body?.status === 'error') {
          throw new ValidationError(body.error || 'Label values query failed');
        }
        const values = (body?.data ?? []).filter(
          (value) => typeof value === 'string' && value !== ''
        );

        logger.service(SERVICE_NAME, 'labelValues', {
          input: { projectId, name, itemCount: values.length },
          duration: Date.now() - startTime,
        });

        return values;
      } catch (error) {
        const mapped = mapApiError(error);
        logger.error(`${SERVICE_NAME}.labelValues failed`, mapped);
        throw mapped;
      }
    },
  };
}

export type O11yLogService = ReturnType<typeof createO11yLogService>;
