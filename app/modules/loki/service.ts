/**
 * Main service class for Loki activity logs
 */
import { createLokiClient, buildLogQLQuery, executeLokiQuery } from './client';
import { convertTimeToUserFriendly } from './formatter';
import { processLogEntries } from './parser';
import type { QueryParams, ActivityLogsResponse } from './types';
import { validateQueryParams } from './validator';

/**
 * Main service class for Loki activity logs
 */
export class LokiActivityLogsService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Fetches and processes activity logs from Loki
   */
  async getActivityLogs(queryParams: QueryParams): Promise<ActivityLogsResponse> {
    // Validate and sanitize parameters
    const validatedParams = validateQueryParams(queryParams);
    const projectName = queryParams.project || 'test-logs-t6cckb';

    // Log the parameters for debugging
    console.log('Loki query parameters:', { ...validatedParams, projectName });

    // Create Loki client
    const client = createLokiClient(this.accessToken);

    // Build LogQL query
    const logQuery = buildLogQLQuery({
      baseSelector: '{telemetry_datumapis_com_audit_log="true"}',
      projectName,
      level: validatedParams.level || queryParams.level,
      search: queryParams.search,
    });

    // Execute query
    const response = await executeLokiQuery(client, logQuery, {
      start: validatedParams.start,
      end: validatedParams.end,
      limit: validatedParams.limit,
    });

    // Process logs
    const logs =
      response.logs && Array.isArray(response.logs) ? processLogEntries(response.logs) : [];

    // Sort logs by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Convert time parameters to ISO date strings
    const startTime = convertTimeToUserFriendly(validatedParams.start);
    const endTime = convertTimeToUserFriendly(validatedParams.end);

    // Build response
    return {
      logs,
      total: logs.length,
      hasMore: logs.length >= validatedParams.limit,
      query: logQuery,
      timeRange: {
        start: startTime,
        end: endTime,
      },
    };
  }
}
