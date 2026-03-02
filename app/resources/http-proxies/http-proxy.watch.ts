import { toHttpProxy } from './http-proxy.adapter';
import type { HttpProxy } from './http-proxy.schema';
import { httpProxyKeys } from './http-proxy.service';
import type { ComDatumapisNetworkingV1AlphaHttpProxy } from '@/modules/control-plane/networking';
import { useResourceWatch } from '@/modules/watch';
import { waitForWatch } from '@/modules/watch/watch-wait.helper';
import { ControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

/**
 * Watch HTTP proxies list for real-time updates.
 */
export function useHttpProxiesWatch(projectId: string, options?: { enabled?: boolean }) {
  const queryKey = httpProxyKeys.list(projectId);

  // Watch HTTPProxy resources
  useResourceWatch<HttpProxy>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/httpproxies',
    projectId,
    namespace: 'default',
    queryKey,
    transform: (item) => toHttpProxy(item as ComDatumapisNetworkingV1AlphaHttpProxy),
    enabled: options?.enabled ?? true,
    getItemKey: (proxy) => proxy.name,
    updateListCache: (oldData, newItem) => {
      // Preserve fields that watch events may omit or send partially
      if (Array.isArray(oldData)) {
        const existingItem = oldData.find((item) => item.name === newItem.name);
        if (existingItem) {
          return oldData.map((item) =>
            item.name === newItem.name
              ? {
                  ...newItem,
                  ...(existingItem.trafficProtectionMode !== undefined && {
                    trafficProtectionMode: existingItem.trafficProtectionMode,
                    paranoiaLevels: existingItem.paranoiaLevels,
                  }),
                  ...(existingItem.enableHttpRedirect !== undefined && {
                    enableHttpRedirect: existingItem.enableHttpRedirect,
                  }),
                }
              : item
          );
        }
      }
      // Default behavior: find and replace
      if (Array.isArray(oldData)) {
        return oldData.map((item) => (item.name === newItem.name ? newItem : item));
      }
      return oldData;
    },
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
  const queryKey = httpProxyKeys.detail(projectId, name);

  // Watch HTTPProxy resource
  useResourceWatch<HttpProxy>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/httpproxies',
    projectId,
    namespace: 'default',
    name,
    queryKey,
    transform: (item) => toHttpProxy(item as ComDatumapisNetworkingV1AlphaHttpProxy),
    enabled: options?.enabled ?? true,
    updateSingleCache: (oldData, newItem) => {
      // Preserve fields that watch events may omit or send partially (WAF from separate policy,
      // enableHttpRedirect derived from spec.rules which may be missing in partial watch payloads)
      if (!oldData) return newItem;

      return {
        ...newItem,
        ...(oldData.trafficProtectionMode !== undefined && {
          trafficProtectionMode: oldData.trafficProtectionMode,
          paranoiaLevels: oldData.paranoiaLevels,
        }),
        ...(oldData.enableHttpRedirect !== undefined && {
          enableHttpRedirect: oldData.enableHttpRedirect,
        }),
      };
    },
  });
}

/**
 * Wait for HTTP proxy to reach Ready status.
 * Used in task processors for async K8s operations.
 *
 * Returns a cancellable promise that resolves when the HTTP proxy status becomes Ready,
 * or rejects if the proxy has an error condition. Call `cancel()` to cleanup the
 * watch subscription (important for task cancellation and timeout handling).
 *
 * @param projectId - Project ID (used as namespace)
 * @param proxyName - Name of the HTTP proxy to watch
 * @returns Object with `promise` and `cancel()` function
 *
 * @example
 * ```typescript
 * processor: async (ctx) => {
 *   // 1. Create HTTP proxy via API
 *   await createHttpProxy({ projectId, body: proxySpec });
 *
 *   // 2. Wait for K8s reconciliation with auto cleanup
 *   const { promise, cancel } = waitForHttpProxyReady(projectId, proxyName);
 *   ctx.onCancel(cancel); // Cleanup called automatically on cancel/timeout
 *
 *   const proxy = await promise;
 *
 *   // 3. Task completes when Ready
 *   ctx.setResult(proxy);
 *   ctx.succeed();
 * };
 * ```
 */
export function waitForHttpProxyReady(
  projectId: string,
  proxyName: string
): {
  promise: Promise<HttpProxy>;
  cancel: () => void;
} {
  return waitForWatch<HttpProxy>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/httpproxies',
    projectId,
    namespace: 'default',
    name: proxyName,
    onEvent: (event) => {
      if (event.type === 'ADDED' || event.type === 'MODIFIED') {
        const proxy = toHttpProxy(event.object as ComDatumapisNetworkingV1AlphaHttpProxy);
        const status = transformControlPlaneStatus(proxy.status, {
          includeConditionDetails: true,
        });

        if (status.status === ControlPlaneStatus.Success) {
          return { resolve: proxy };
        }

        // Check conditions for error states (not just pending)
        // Only reject if condition is False AND reason is not "Pending" (which is normal during reconciliation)
        const failedCondition = status.conditions?.find(
          (c) => c.status === 'False' && c.reason && c.reason !== 'Pending'
        );
        if (failedCondition) {
          return {
            reject: new Error(
              failedCondition.message || status.message || 'HTTP proxy reconciliation failed'
            ),
          };
        }
      }

      return 'continue';
    },
  });
}
