// app/resources/service-accounts/service-account.watch.ts
import { preserveKeySummary, toServiceAccount } from './service-account.adapter';
import { SERVICE_ACCOUNT_SYNC_KIND, serviceAccountKeys } from './service-account.service';
import type { ServiceAccount } from './types';
import type { ComMiloapisIamV1Alpha1ServiceAccount } from '@/modules/control-plane/iam';
import { useResourceWatch } from '@/modules/watch';
import type { WatchCacheConfig } from '@/modules/watch/watch-cache-handler';

export const serviceAccountListWatchCache = (projectId: string) =>
  ({
    queryKey: serviceAccountKeys.list(projectId),
    // In-place cache update for MODIFIED events. The list cache is a plain
    // ServiceAccount[] (no { items: [] } envelope), so we map the array.
    getItemKey: (account) => account.name,
    syncKind: SERVICE_ACCOUNT_SYNC_KIND,
    syncScope: projectId,
    updateListCache: (oldData, newItem) => {
      const old = oldData as ServiceAccount[] | undefined;
      if (!old) return [newItem];
      // The event carries no keys, so keep the summary the list fetch derived.
      return old.map((sa) => (sa.name === newItem.name ? preserveKeySummary(sa, newItem) : sa));
    },
  }) satisfies Omit<WatchCacheConfig<ServiceAccount>, 'isDetail'>;

/**
 * Watch service accounts list for real-time updates.
 *
 * @example
 * ```tsx
 * function ServiceAccountsPage() {
 *   const { data } = useServiceAccounts(projectId);
 *
 *   // Subscribe to live updates
 *   useServiceAccountsWatch(projectId);
 *
 *   return <ServiceAccountTable accounts={data ?? []} />;
 * }
 * ```
 */
export function useServiceAccountsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<ServiceAccount>({
    resourceType: 'apis/iam.miloapis.com/v1alpha1/serviceaccounts',
    projectId,
    namespace: 'default',
    transform: (item) => toServiceAccount(item as ComMiloapisIamV1Alpha1ServiceAccount),
    enabled: options?.enabled ?? true,
    ...serviceAccountListWatchCache(projectId),
  });
}

/**
 * Watch a single service account for real-time updates.
 *
 * @example
 * ```tsx
 * function ServiceAccountDetailLayout() {
 *   const { data } = useServiceAccount(projectId, name);
 *
 *   // Subscribe to live updates
 *   useServiceAccountWatch(projectId, name);
 *
 *   return <ServiceAccountDetail account={data} />;
 * }
 * ```
 */
export function useServiceAccountWatch(
  projectId: string,
  name: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<ServiceAccount>({
    resourceType: 'apis/iam.miloapis.com/v1alpha1/serviceaccounts',
    projectId,
    namespace: 'default',
    name,
    queryKey: serviceAccountKeys.detail(projectId, name),
    transform: (item) => toServiceAccount(item as ComMiloapisIamV1Alpha1ServiceAccount),
    enabled: options?.enabled ?? true,
    // The event carries no keys, so keep the summary the detail fetch derived.
    updateSingleCache: (oldData, newItem) => preserveKeySummary(oldData, newItem),
  });
}
