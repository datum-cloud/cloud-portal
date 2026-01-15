import { z } from 'zod';

/**
 * Scope for querying activity logs.
 * Determines which control plane endpoint to use.
 */
export const activityLogScopeSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('organization'),
    organizationId: z.string(),
  }),
  z.object({
    type: z.literal('project'),
    projectId: z.string(),
  }),
  z.object({
    type: z.literal('user'),
    userId: z.string(),
  }),
]);

export type ActivityLogScope = z.infer<typeof activityLogScopeSchema>;

/**
 * Query parameters for fetching activity logs.
 */
export const activityLogQueryParamsSchema = z.object({
  scope: activityLogScopeSchema,
  startTime: z.string(),
  endTime: z.string(),
  filter: z.string().optional(),
  limit: z.number().min(1).max(1000).default(50),
  continue: z.string().optional(),
});

export type ActivityLogQueryParams = z.infer<typeof activityLogQueryParamsSchema>;

/**
 * Transformed activity log entry for UI display.
 */
export const activityLogSchema = z.object({
  /** Unique audit ID */
  id: z.string(),
  /** When the action occurred */
  timestamp: z.coerce.date(),
  /** User who performed the action (email or system account) */
  user: z.string(),
  userId: z.string().optional(),

  /** Raw verb (create, update, delete, patch, get, list) */
  verb: z.string(),
  /** Resource type (domains, dnszones, users, etc.) */
  resource: z.string(),
  /** Name of the specific resource */
  resourceName: z.string(),
  /** Namespace of the resource (if applicable) */
  resourceNamespace: z.string().optional(),
  /** HTTP status code of the response */
  statusCode: z.number(),
  /** Humanized action (e.g., "Added a domain") */
  action: z.string(),
  /** Formatted details (e.g., "Domain: example.com") */
  details: z.string(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;

/**
 * Paginated response for activity logs.
 */
export const activityLogListSchema = z.object({
  items: z.array(activityLogSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  effectiveStartTime: z.string(),
  effectiveEndTime: z.string(),
});

export type ActivityLogList = z.infer<typeof activityLogListSchema>;

/**
 * Filter parameters from UI controls.
 */
export interface ActivityLogFilterParams {
  /** Free text search (user + resource name) */
  search?: string;
  /** Action verbs to include */
  actions?: string[];
  /** Resource types to include */
  resources?: string[];
}
