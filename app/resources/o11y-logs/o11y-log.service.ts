import { toLogEntries } from './o11y-log.adapter';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { ValidationError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';
import type { LogEntry, LokiQueryRangeResponse } from '@datum-cloud/datum-ui/logs';

const SERVICE_NAME = 'O11yLogService';

export const O11Y_LOGS_QUERY_RANGE_PATH =
  '/apis/o11y.miloapis.com/v1alpha1/logs/loki/api/v1/query_range';

export const o11yLogKeys = {
  all: ['o11y-logs'] as const,
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

type O11yLogClient = Pick<typeof client, 'get'>;

/**
 * Tenant-scoped log queries against telemetry queryapi's Loki-shaped routes.
 * Project tenancy is the control-plane base URL; queryapi never takes a
 * client-supplied project id.
 *
 * `client` is injectable so tests do not `mock.module` the shared control-plane
 * client (that mock is process-global in bun and would strip `getConfig` from
 * every other suite).
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
  };
}

export type O11yLogService = ReturnType<typeof createO11yLogService>;
