// app/resources/domains/domain.watch.ts
import { toDomain } from './domain.adapter';
import type { Domain } from './domain.schema';
import { DOMAIN_SYNC_KIND, domainKeys } from './domain.service';
import type { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';
import { useResourceWatch } from '@/modules/watch';
import type { WatchCacheConfig } from '@/modules/watch/watch-cache-handler';

export const domainListWatchCache = (projectId: string) =>
  ({
    queryKey: domainKeys.list(projectId),
    getItemKey: (domain) => domain.name,
    syncKind: DOMAIN_SYNC_KIND,
    syncScope: projectId,
  }) satisfies Omit<WatchCacheConfig<Domain>, 'isDetail'>;

/**
 * Watch domains list for real-time updates.
 *
 * throttleMs only gates the invalidate fallback, which this watch never
 * reaches — `getItemKey` routes every event through an in-place cache write.
 *
 * Replayed ADDED events are applied: domains are created as a side effect of
 * writes the domains list never sees (the backend reconciles ALB hostnames
 * into Domain resources), so dropping them would leave a cache seeded before
 * such a write stale until a full page reload (#1491).
 */
export function useDomainsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Domain>({
    resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
    projectId,
    namespace: 'default',
    transform: (item) => toDomain(item as ComDatumapisNetworkingV1AlphaDomain),
    enabled: options?.enabled ?? true,
    ...domainListWatchCache(projectId),
    throttleMs: 5000,
    debounceMs: 300,
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
