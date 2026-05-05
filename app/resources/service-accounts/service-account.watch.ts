// app/resources/service-accounts/service-account.watch.ts
import { toServiceAccount } from './service-account.adapter';
import { serviceAccountKeys } from './service-account.service';
import type { ServiceAccount } from './types';
import type { ComMiloapisIamV1Alpha1ServiceAccount } from '@/modules/control-plane/iam';
import { useResourceWatch } from '@/modules/watch';

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
    queryKey: serviceAccountKeys.list(projectId),
    transform: (item) => toServiceAccount(item as ComMiloapisIamV1Alpha1ServiceAccount),
    enabled: options?.enabled ?? true,
    // In-place cache update for MODIFIED events. The list cache is a plain
    // ServiceAccount[] (no { items: [] } envelope), so we map the array.
    getItemKey: (account) => account.name,
    updateListCache: (oldData, newItem) => {
      const old = oldData as ServiceAccount[] | undefined;
      if (!old) return [newItem];
      return old.map((sa) => (sa.name === newItem.name ? newItem : sa));
    },
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
  });
}
