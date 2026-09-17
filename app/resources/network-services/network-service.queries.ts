import { createNetworkServiceService, networkServiceKeys } from './network-service.service';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import { resolveRelatedResource } from '@/resources/http-proxies/related-resource';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

type NetworkServiceQueryOptions<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;

/**
 * List NetworkServices in a project. 403/404 degrade to an empty list (same
 * pattern as other related-resource reads) so viewers without permission never
 * surface an error on the ALB list.
 */
export function useNetworkServices(
  projectId: string,
  options?: NetworkServiceQueryOptions<ComDatumapisNetworkingV1AlphaNetworkService[]>
) {
  return useQuery({
    queryKey: networkServiceKeys.list(projectId),
    queryFn: async () => {
      const result = await resolveRelatedResource(() =>
        createNetworkServiceService().list(projectId)
      );
      if (result.state !== 'ok') return [];
      return result.data ?? [];
    },
    retry: false,
    ...options,
    enabled: !!projectId && options?.enabled !== false,
  });
}

/**
 * Read a single NetworkService. 403/404 degrade to `null` so a missing
 * permission does not blank the ALB overview.
 */
export function useNetworkService(
  projectId: string,
  name: string | undefined,
  options?: NetworkServiceQueryOptions<ComDatumapisNetworkingV1AlphaNetworkService | null>
) {
  return useQuery({
    queryKey: networkServiceKeys.detail(projectId, name ?? ''),
    queryFn: async () => {
      if (!name) return null;
      const result = await resolveRelatedResource(() =>
        createNetworkServiceService().get(projectId, name)
      );
      if (result.state !== 'ok') return null;
      return result.data;
    },
    retry: false,
    ...options,
    enabled: !!projectId && !!name && options?.enabled !== false,
  });
}
