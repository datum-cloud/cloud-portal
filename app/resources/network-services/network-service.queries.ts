import { createNetworkServiceService, networkServiceKeys } from './network-service.service';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import { usePermission } from '@/modules/rbac';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

const NETWORK_SERVICE_GROUP = 'networking.datumapis.com';

type NetworkServiceQueryOptions<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;

/**
 * List NetworkServices in a project. The fetch is gated on a `list`
 * SelfSubjectAccessReview so viewers without the permission never trigger a
 * 403 — the query simply stays idle and `data` is undefined.
 */
export function useNetworkServices(
  projectId: string,
  options?: NetworkServiceQueryOptions<ComDatumapisNetworkingV1AlphaNetworkService[]>
) {
  const wanted = !!projectId && options?.enabled !== false;
  const { hasPermission } = usePermission('networkservices', 'list', {
    group: NETWORK_SERVICE_GROUP,
    namespace: 'default',
    scope: 'project',
    projectId,
    enabled: wanted,
  });

  return useQuery({
    queryKey: networkServiceKeys.list(projectId),
    queryFn: () => createNetworkServiceService().list(projectId),
    retry: false,
    ...options,
    enabled: wanted && hasPermission,
  });
}

/**
 * Read a single NetworkService. Gated on a `get` SelfSubjectAccessReview for
 * the same reason as {@link useNetworkServices}.
 */
export function useNetworkService(
  projectId: string,
  name: string | undefined,
  options?: NetworkServiceQueryOptions<ComDatumapisNetworkingV1AlphaNetworkService>
) {
  const wanted = !!projectId && !!name && options?.enabled !== false;
  const { hasPermission } = usePermission('networkservices', 'get', {
    group: NETWORK_SERVICE_GROUP,
    namespace: 'default',
    name,
    scope: 'project',
    projectId,
    enabled: wanted,
  });

  return useQuery({
    queryKey: networkServiceKeys.detail(projectId, name ?? ''),
    queryFn: () => createNetworkServiceService().get(projectId, name!),
    retry: false,
    ...options,
    enabled: wanted && hasPermission,
  });
}
