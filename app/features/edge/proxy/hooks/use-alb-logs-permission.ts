import { usePermission } from '@/modules/rbac';

export const O11Y_LOGS_GROUP = 'o11y.miloapis.com';
export const O11Y_LOGS_RESOURCE = 'logs';

export const ALB_LOGS_DENIED_MESSAGE =
  "You don't have permission to view logs for this Application Load Balancer";

/** Aggregator hop for queryapi log routes (`o11y.miloapis.com/logs.get`). */
export function useAlbLogsPermission() {
  return usePermission(O11Y_LOGS_RESOURCE, 'get', {
    group: O11Y_LOGS_GROUP,
    scope: 'project',
  });
}
