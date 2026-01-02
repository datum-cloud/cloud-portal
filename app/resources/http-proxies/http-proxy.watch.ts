import { toHttpProxy } from './http-proxy.adapter';
import type { HttpProxy } from './http-proxy.schema';
import { httpProxyKeys } from './http-proxy.service';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch HTTP proxies list for real-time updates.
 */
export function useHttpProxiesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<HttpProxy>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/httpproxies',
    projectId,
    namespace: 'default',
    queryKey: httpProxyKeys.list(projectId),
    transform: (item) => toHttpProxy(item as ComDatumapisNetworkingV1AlphaHttpProxy),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single HTTP proxy for real-time updates.
 */
export function useHttpProxyWatch(
  projectId: string,
  name: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<HttpProxy>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/httpproxies',
    projectId,
    namespace: 'default',
    name,
    queryKey: httpProxyKeys.detail(projectId, name),
    transform: (item) => toHttpProxy(item as ComDatumapisNetworkingV1AlphaHttpProxy),
    enabled: options?.enabled ?? true,
  });
}
