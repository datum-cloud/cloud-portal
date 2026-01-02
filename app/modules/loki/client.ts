/**
 * Loki client management and query execution
 */
import type { LokiConfig, LokiQueryResponse, LogQLQueryOptions } from './types';
import { env } from '@/utils/env/env.server';
import { GrafanaApi } from '@myunisoft/loki';

export const LOKI_CONFIG: LokiConfig = {
  remoteApiURL: env.server.telemetryUrl || '',
  defaultLimit: 100,
  maxLimit: 1000,
  defaultTimeRange: '48h',
} as const;

/**
 * Builds LogQL query string with hybrid filtering approach
 */
export function buildLogQLQuery(options: LogQLQueryOptions): string {
  const {
    baseSelector,
    project,
    organization,
    user,
    resource,
    objectName,
    apiGroup,
    apiVersion,
    status,
    actions,
    stage,
    excludeDryRun,
  } = options;

  let query = `${baseSelector} | json`;

  // Add stage filter if specified
  if (stage) {
    query += ` | stage="${stage}"`;
  }

  // Add dry run exclusion filter if enabled
  if (excludeDryRun) {
    query += ` | requestURI !~ ".*dryRun=All.*"`;
  }

  // Project filter (legacy support)
  if (project) {
    query += ` | annotations_resourcemanager_miloapis_com_project_name="${project}"`;
  }

  // organization filter
  if (organization) {
    query += ` | annotations_resourcemanager_miloapis_com_organization_name="${organization}"`;
  }

  // Filter for specific verbs using regex (if verbs parameter is provided)
  if (actions) {
    const actionList = actions
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v);
    if (actionList.length > 0) {
      const actionPattern = actionList.join('|');
      query += ` | verb=~"(?i)(${actionPattern})"`;
    }
  }

  // Note: LogQL doesn't support OR conditions in filters
  // The 'q' parameter will be handled by client-side filtering
  // Only specific field filters are supported in LogQL

  // Specific field filters (AND conditions)
  if (user) {
    query += ` | user_username="${user}"`;
  }

  // ObjectRef filtering - complete Kubernetes resource identification
  if (resource) {
    query += ` | objectRef_resource="${resource}"`;
  }

  if (objectName) {
    query += ` | objectRef_name="${objectName}"`;
  }

  if (apiGroup) {
    query += ` | objectRef_apiGroup="${apiGroup}"`;
  }

  if (apiVersion) {
    query += ` | objectRef_apiVersion="${apiVersion}"`;
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
  } catch (error: any) {
    console.error('Loki query failed:', error);

    // Preserve the original error if it's a timeout/network error so it can be properly detected upstream
    // Check for common timeout/network error indicators
    if (
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ERR_CANCELED' ||
      (error?.request && !error?.response) ||
      error?.message?.toLowerCase().includes('timeout') ||
      error?.message?.toLowerCase().includes('network')
    ) {
      // Re-throw the original error to preserve its properties
      throw error;
    }

    // For other errors, wrap in a new Error with a descriptive message
    throw new Error(
      `Failed to query Loki: ${error?.data ? error.data : error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
