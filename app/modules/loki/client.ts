/**
 * Loki client management and query execution
 */
import type { LokiConfig, LokiQueryResponse, LogQLQueryOptions } from './types';
import { GrafanaApi } from '@myunisoft/loki';

export const LOKI_CONFIG: LokiConfig = {
  remoteApiURL: process.env.TELEMETRY_URL || '',
  defaultLimit: 100,
  maxLimit: 1000,
  defaultTimeRange: '48h',
} as const;

/**
 * Builds LogQL query string with hybrid filtering approach
 */
export function buildLogQLQuery(options: LogQLQueryOptions): string {
  const { baseSelector, projectName, user, action, resource, status } = options;

  let query = `${baseSelector} | json`;

  // Project filter (legacy support)
  if (projectName) {
    query += ` | annotations_resourcemanager_miloapis_com_project_name="${projectName}"`;
  }

  // Note: LogQL doesn't support OR conditions in filters
  // The 'q' parameter will be handled by client-side filtering
  // Only specific field filters are supported in LogQL

  // Specific field filters (AND conditions)
  if (user) {
    query += ` | user_username="${user}"`;
  }

  if (action) {
    query += ` | verb="${action}"`;
  }

  if (resource) {
    query += ` | objectRef_resource="${resource}"`;
  }

  if (status) {
    // Handle status filter - can be 'success', 'error', or specific codes
    if (status === 'success') {
      query += ` | responseStatus_code < 400`;
    } else if (status === 'error') {
      query += ` | responseStatus_code >= 400`;
    } else {
      // Specific status code
      query += ` | responseStatus_code = ${status}`;
    }
  }

  return query;
}

/**
 * Creates and configures Loki client
 */
export function createLokiClient(accessToken: string): GrafanaApi {
  return new GrafanaApi({
    authentication: {
      type: 'bearer',
      token: accessToken,
    },
    remoteApiURL: LOKI_CONFIG.remoteApiURL,
  });
}

/**
 * Executes Loki query with proper error handling
 */
export async function executeLokiQuery(
  client: GrafanaApi,
  query: string,
  options: {
    start: string;
    end: string;
    limit: number;
  }
): Promise<LokiQueryResponse> {
  try {
    console.log('Executing LogQL query:', query);
    console.log('Query options:', options);

    const response = (await client.Loki.queryRange(query, options)) as LokiQueryResponse;

    console.log('Loki response received:', {
      logsCount: response.logs?.length || 0,
      timerange: response.timerange,
    });

    return response;
  } catch (error) {
    console.error('Loki query failed:', error);
    throw new Error(
      `Failed to query Loki: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
