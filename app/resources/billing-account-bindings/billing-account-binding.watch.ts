import { billingAccountBindingKeys } from './billing-account-binding.service';
import type { BillingAccountBinding } from '@/features/billing/types';
import { useResourceWatch } from '@/modules/watch';
import { buildOrganizationNamespace } from '@/utils/common';
import { useMemo } from 'react';

const RESOURCE_TYPE = 'apis/billing.miloapis.com/v1alpha1/billingaccountbindings';

/**
 * Watch the bindings list for one org. Bindings are append-only, so
 * MODIFIED events typically fire when the controller flips an old
 * binding to `Superseded` — we keep the in-place update so the
 * rebind-dropdown stops surfacing the previous entry as Active
 * without a full refetch.
 */
export function useBillingAccountBindingsWatch(
  orgId: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryKey = useMemo(() => billingAccountBindingKeys.list(orgId ?? ''), [orgId]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<BillingAccountBinding>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    queryKey,
    transform: (item) => item as BillingAccountBinding,
    enabled: (options?.enabled ?? true) && !!orgId,
    getItemKey: (binding) => binding.metadata?.name ?? '',
    updateListCache: (oldData, newItem) => {
      if (!Array.isArray(oldData)) return oldData;
      const name = newItem.metadata?.name;
      if (!name) return oldData;
      const list = oldData as BillingAccountBinding[];
      // Evict on the MODIFIED-with-deletionTimestamp event so a
      // removed binding drops out immediately instead of lingering
      // until the trailing DELETED event. Mirrors the billing-account
      // watch.
      if (newItem.metadata?.deletionTimestamp) {
        return list.filter((b) => b.metadata?.name !== name);
      }
      const exists = list.some((b) => b.metadata?.name === name);
      return exists
        ? list.map((b) => (b.metadata?.name === name ? newItem : b))
        : [...list, newItem];
    },
  });
}
