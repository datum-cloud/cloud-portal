import { billingAccountKeys } from './billing-account.service';
import type { BillingAccount } from '@/features/billing/types';
import { useResourceWatch } from '@/modules/watch';
import { buildOrganizationNamespace } from '@/utils/common';
import { useMemo } from 'react';

const RESOURCE_TYPE = 'apis/billing.miloapis.com/v1alpha1/billingaccounts';

/**
 * Watch the billing accounts list for one org. Keeps the React Query
 * cache for `billingAccountKeys.list(orgId)` in sync with controller
 * updates (e.g. `status.phase` flipping to `Ready`).
 */
export function useBillingAccountsWatch(
  orgId: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryKey = useMemo(() => billingAccountKeys.list(orgId ?? ''), [orgId]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<BillingAccount>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    queryKey,
    transform: (item) => item as BillingAccount,
    enabled: (options?.enabled ?? true) && !!orgId,
    // In-place list updates so the status badge can flip without a
    // full refetch when the controller reconciles. MODIFIED events
    // that gain a `deletionTimestamp` evict the row from the cache
    // — K8s sets the timestamp on DELETE and the resource sticks
    // around in LIST responses until finalizers run, so without
    // this hook the table would keep showing the row in "Deleting"
    // state until the watch finally emits a real DELETED event.
    getItemKey: (account) => account.metadata?.name ?? '',
    updateListCache: (oldData, newItem) => {
      if (!Array.isArray(oldData)) return oldData;
      const name = newItem.metadata?.name;
      if (!name) return oldData;
      const list = oldData as BillingAccount[];
      if (newItem.metadata?.deletionTimestamp) {
        return list.filter((a) => a.metadata?.name !== name);
      }
      const exists = list.some((a) => a.metadata?.name === name);
      return exists
        ? list.map((a) => (a.metadata?.name === name ? newItem : a))
        : [...list, newItem];
    },
  });
}

/**
 * Watch a single billing account by `(orgId, name)`. Updates the
 * detail cache directly so badges + addresses reflect controller
 * activity without a refetch.
 */
export function useBillingAccountWatch(
  orgId: string | undefined,
  name: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryKey = useMemo(() => billingAccountKeys.detail(orgId ?? '', name ?? ''), [orgId, name]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<BillingAccount>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    name,
    queryKey,
    transform: (item) => item as BillingAccount,
    enabled: (options?.enabled ?? true) && !!orgId && !!name,
  });
}
