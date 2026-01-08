// app/resources/domains/domain.watch.ts
import { toDomain } from './domain.adapter';
import type { Domain } from './domain.schema';
import { domainKeys } from './domain.service';
import type { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch domains list for real-time updates.
 *
 * Uses slower throttle (5000ms) because:
 * - Domains have continuous status updates (registrar lookup, nameserver resolution)
 * - Server pings frequently with status changes
 * - Prevents UI flickering from rapid status updates
 */
export function useDomainsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Domain>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
    projectId,
    namespace: 'default',
    queryKey: domainKeys.list(projectId),
    transform: (item) => toDomain(item as ComDatumapisNetworkingV1AlphaDomain),
    enabled: options?.enabled ?? true,
    // Slow throttle for continuous status updates (prevents UI flickering)
    throttleMs: 5000,
    debounceMs: 300,
    // Skip initial sync - cache is already hydrated from SSR
    skipInitialSync: true,
  });
}

/**
 * Watch a single domain for real-time updates.
 */
export function useDomainWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Domain>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
    projectId,
    namespace: 'default',
    name,
    queryKey: domainKeys.detail(projectId, name),
    transform: (item) => toDomain(item as ComDatumapisNetworkingV1AlphaDomain),
    enabled: options?.enabled ?? true,
  });
}
