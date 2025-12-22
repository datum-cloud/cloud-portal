/**
 * Main service class for Loki activity logs
 */
import { createLokiClient, buildLogQLQuery, executeLokiQuery } from './client';
import { convertTimeToUserFriendly } from './formatter';
import { processLogEntries } from './parser';
import type { QueryParams, ActivityLogsResponse } from './types';
import { validateQueryParams } from './validator';
import { isTimeoutOrNetworkError } from '@/utils/errors/axios';

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
    try {
      // Validate and sanitize parameters
      const validatedParams = validateQueryParams(queryParams);

      // Log the parameters for debugging
      console.log('Loki query parameters:', { ...validatedParams });

      // Create Loki client
      const client = createLokiClient(this.accessToken);

      // Build LogQL query
      const logQuery = buildLogQLQuery({
        baseSelector: '{telemetry_datumapis_com_audit_log="true"}',
        // Hybrid filtering approach with type conversion
        project: queryParams.project,
        organization: queryParams.organization,
        q: queryParams.q,
        user: queryParams.user,
        resource: queryParams.resource,
        objectName: queryParams.objectName,
        apiGroup: queryParams.apiGroup,
        apiVersion: queryParams.apiVersion,
        status: queryParams.status,
        actions: queryParams.actions,
        stage: queryParams.stage,
        excludeDryRun: queryParams.excludeDryRun, // Pass boolean directly
      });

      // Execute query
      const response = await executeLokiQuery(client, logQuery, {
        start: validatedParams.start,
        end: validatedParams.end,
        limit: validatedParams.limit,
      });

      // Process logs
      const showNamespace = !queryParams.organization; // Hide namespace for org-level queries
      let logs =
        response.logs && Array.isArray(response.logs)
          ? processLogEntries(response.logs, { showNamespace })
          : [];

      // Apply flexible search (q parameter) on server side
      if (queryParams.q) {
        const searchTerm = queryParams.q.toLowerCase();
        logs = logs.filter((log) => {
          const searchableText = [
            log.user?.username || '',
            log.verb || '',
            log.resource?.resource || '',
            log.resource?.name || '',
            log.resource?.apiGroup || '',
            log.message || '',
            log.responseStatus?.code?.toString() || '',
            log.responseStatus?.reason || '',
            log.requestUri || '',
            log.userAgent || '',
          ]
            .join(' ')
            .toLowerCase();

          return searchableText.includes(searchTerm);
        });
      }

      // Sort logs by timestamp descending (most recent first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Convert time parameters to ISO date strings
      const startTime = convertTimeToUserFriendly(validatedParams.start);
      const endTime = convertTimeToUserFriendly(validatedParams.end);

      // Build response
      return {
        logs,
        query: logQuery,
        timeRange: {
          start: startTime,
          end: endTime,
        },
      };
    } catch (error) {
      // Handle timeout and network errors gracefully at service layer
      if (isTimeoutOrNetworkError(error)) {
        // Return empty response instead of throwing
        const validatedParams = validateQueryParams(queryParams);
        const startTime = convertTimeToUserFriendly(validatedParams.start);
        const endTime = convertTimeToUserFriendly(validatedParams.end);

        return {
          logs: [],
          query: '',
          timeRange: {
            start: startTime,
            end: endTime,
          },
        };
      }

      // Re-throw other errors to be handled upstream
      throw error;
    }
  }
}
