import { humanizeAction, formatDetails } from './activity-log.helpers';
import type { ActivityLog, ActivityLogList } from './activity-log.schema';
import type { ComMiloapisGoActivityPkgApisActivityV1Alpha1AuditLogQuery } from '@/modules/control-plane/activity';
import type { IoK8sApiserverPkgApisAuditV1Event } from '@/modules/control-plane/activity';

/**
 * Transforms a single audit event from the API to our ActivityLog type.
 *
 * @param event - Raw audit event from the API
 * @returns Transformed ActivityLog for UI display
 */
export function toActivityLog(event: IoK8sApiserverPkgApisAuditV1Event): ActivityLog {
  const verb = event.verb || 'unknown';
  const resource = event.objectRef?.resource || 'unknown';
  const resourceName = event.objectRef?.name || '';

  return {
    id: event.auditID,
    timestamp: new Date(event.requestReceivedTimestamp || new Date()),
    user: event.user?.username || 'unknown',
    userId: event.user?.uid || undefined,
    verb,
    resource,
    resourceName,
    resourceNamespace: event.objectRef?.namespace,
    statusCode: event.responseStatus?.code || 0,
    action: humanizeAction(verb, resource),
    details: formatDetails(resource, resourceName),
  };
}

/**
 * Transforms the AuditLogQuery response to our ActivityLogList type.
 *
 * @param response - Raw AuditLogQuery response from the API
 * @returns Transformed ActivityLogList for UI display
 */
export function toActivityLogList(
  response: ComMiloapisGoActivityPkgApisActivityV1Alpha1AuditLogQuery
): ActivityLogList {
  const results = response.status?.results || [];
  const items = results.map(toActivityLog);
  const nextCursor = response.status?.continue || null;

  return {
    items,
    nextCursor,
    hasMore: !!nextCursor,
    effectiveStartTime: response.status?.effectiveStartTime || '',
    effectiveEndTime: response.status?.effectiveEndTime || '',
  };
}
