import { toActivityLogList } from './activity-log.adapter';
import { buildCombinedFilter } from './activity-log.helpers';
import type {
  ActivityLogScope,
  ActivityLogQueryParams,
  ActivityLogList,
  ActivityLogFilterParams,
} from './activity-log.schema';
import { createActivityMiloapisComV1Alpha1AuditLogQuery } from '@/modules/control-plane/activity';
import { logger } from '@/modules/logger';
import { getOrgScopedBase, getProjectScopedBase, getUserScopedBase } from '@/resources/base';

const SERVICE_NAME = 'ActivityLogService';

/**
 * Query keys for React Query cache management.
 *
 * Structure: ['activityLogs', scope, filters, pagination]
 * - Changing filters invalidates all pages (new search)
 * - Changing page only fetches that specific page
 */
export const activityLogKeys = {
  all: ['activityLogs'] as const,

  /** Base key for all queries within a scope */
  scope: (scope: ActivityLogScope) => [...activityLogKeys.all, scope] as const,

  /**
   * Key for a specific query with filters.
   * Used to cache paginated results.
   */
  query: (scope: ActivityLogScope, filters: ActivityLogFilterParams, pageSize: number) =>
    [...activityLogKeys.scope(scope), 'query', filters, pageSize] as const,

  /**
   * Key for a specific page within a query.
   * Includes page index for cache lookup.
   */
  page: (
    scope: ActivityLogScope,
    filters: ActivityLogFilterParams,
    pageSize: number,
    pageIndex: number
  ) => [...activityLogKeys.query(scope, filters, pageSize), 'page', pageIndex] as const,
};

/**
 * Creates the Activity Log service for querying audit logs.
 *
 * Uses the Activity API (CRD-based) which returns results
 * immediately in the status field of the created AuditLogQuery.
 */
export function createActivityLogService() {
  return {
    /**
     * Queries activity logs with the given parameters.
     *
     * @param params - Query parameters including scope, filters, and pagination
     * @returns Paginated list of activity logs
     *
     * @example
     * ```ts
     * const result = await service.query({
     *   scope: { type: 'project', projectId: 'my-project' },
     *   startTime: 'now-24h',
     *   endTime: 'now',
     *   limit: 50,
     * });
     * ```
     */
    async query(params: ActivityLogQueryParams): Promise<ActivityLogList> {
      const startTime = Date.now();
      const { scope, startTime: start, endTime: end, filter, limit, continue: cursor } = params;

      try {
        // Get scoped base URL
        const baseURL = this.getScopedBaseURL(scope);

        // Combine user filter with system user exclusion
        const combinedFilter = buildCombinedFilter(filter);

        // Create AuditLogQuery - results come back in status.results
        // Note: Override Content-Type as the auto-generated SDK sets '*/*'
        const response = await createActivityMiloapisComV1Alpha1AuditLogQuery({
          baseURL,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            apiVersion: 'activity.miloapis.com/v1alpha1',
            kind: 'AuditLogQuery',
            metadata: {
              name: `query-${Date.now()}`,
            },
            spec: {
              startTime: start,
              endTime: end,
              limit,
              // Only include optional fields if they have values
              ...(combinedFilter && { filter: combinedFilter }),
              ...(cursor && { continue: cursor }),
            },
          },
        });

        if (!response.data?.status?.results) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
            effectiveStartTime: response.data?.status?.effectiveStartTime || '',
            effectiveEndTime: response.data?.status?.effectiveEndTime || '',
          };
        }

        const result = toActivityLogList(response.data);

        logger.service(SERVICE_NAME, 'query', {
          input: { scope, limit, itemCount: result.items.length },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.query failed`, error as Error);
        throw error;
      }
    },

    /**
     * Gets the scoped API base URL based on the query scope.
     * Reuses existing scoped-urls utilities for consistency.
     *
     * @param scope - Organization, project, or user scope
     * @returns Base URL for the control plane API
     */
    getScopedBaseURL(scope: ActivityLogScope): string {
      switch (scope.type) {
        case 'organization':
          return getOrgScopedBase(scope.organizationId);
        case 'project':
          return getProjectScopedBase(scope.projectId);
        case 'user':
          return getUserScopedBase(scope.userId);
        default:
          throw new Error(`Unknown scope type: ${(scope as any).type}`);
      }
    },
  };
}

export type ActivityLogService = ReturnType<typeof createActivityLogService>;
