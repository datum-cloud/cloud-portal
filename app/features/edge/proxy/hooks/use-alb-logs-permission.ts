import { usePermission } from '@/modules/rbac';

export const O11Y_LOGS_GROUP = 'o11y.miloapis.com';
export const O11Y_LOGS_RESOURCE = 'logs';

export const ALB_LOGS_DENIED_MESSAGE =
  "You don't have permission to view logs for this Application Load Balancer";

/** Both reviews a log query must pass: Milo's proxy hop, then queryapi. */
export function useAlbLogsPermission() {
  const proxyHop = usePermission(O11Y_LOGS_RESOURCE, 'get', {
    group: O11Y_LOGS_GROUP,
    subresource: 'api',
    name: 'loki',
    namespace: '',
    scope: 'project',
  });
  const queryHop = usePermission(O11Y_LOGS_RESOURCE, 'query', {
    group: O11Y_LOGS_GROUP,
    namespace: '',
    scope: 'project',
  });

  return {
    hasPermission: proxyHop.hasPermission && queryHop.hasPermission,
    isLoading: proxyHop.isLoading || queryHop.isLoading,
    isFetching: proxyHop.isFetching || queryHop.isFetching,
    isError: proxyHop.isError || queryHop.isError,
    error: proxyHop.error ?? queryHop.error,
    refetch: () => {
      proxyHop.refetch();
      queryHop.refetch();
    },
  };
}
