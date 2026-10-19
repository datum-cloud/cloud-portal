import { createNetworksService, networkKeys } from './network.service';
import type { ComDatumapisNetworkingV1AlphaNetwork } from '@/modules/control-plane/networking';
import { resolveRelatedResource } from '@/resources/http-proxies/related-resource';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

type NetworkQueryOptions<T> = Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>;

/**
 * List Networks in a project. 403/404 degrade to an empty list so a viewer
 * without permission sees the home page as if no network existed, never an
 * error.
 */
export function useNetworks(
  projectId: string,
  options?: NetworkQueryOptions<ComDatumapisNetworkingV1AlphaNetwork[]>
) {
  return useQuery({
    queryKey: networkKeys.list(projectId),
    queryFn: async () => {
      const result = await resolveRelatedResource(() => createNetworksService().list(projectId));
      if (result.state !== 'ok') return [];
      return result.data ?? [];
    },
    retry: false,
    ...options,
    enabled: !!projectId && options?.enabled !== false,
  });
}
