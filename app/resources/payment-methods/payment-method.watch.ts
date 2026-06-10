import { paymentMethodKeys } from './payment-method.service';
import type { PaymentMethod } from '@/features/billing/types';
import { useResourceWatch } from '@/modules/watch';
import { buildOrganizationNamespace } from '@/utils/common';
import { useMemo } from 'react';

const RESOURCE_TYPE = 'apis/billing.miloapis.com/v1alpha1/paymentmethods';

/**
 * Watch the payment-method list for one org's namespace. Keeps the
 * card list responsive to controller updates without refetching —
 * the badge flip from `Pending` → `Active` happens via MODIFIED
 * events in-place.
 */
export function usePaymentMethodsWatch(orgId: string | undefined, options?: { enabled?: boolean }) {
  const queryKey = useMemo(() => paymentMethodKeys.list(orgId ?? ''), [orgId]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<PaymentMethod>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    queryKey,
    transform: (item) => item as PaymentMethod,
    enabled: (options?.enabled ?? true) && !!orgId,
    getItemKey: (pm) => pm.metadata?.name ?? '',
    updateListCache: (oldData, newItem) => {
      if (!Array.isArray(oldData)) return oldData;
      const name = newItem.metadata?.name;
      if (!name) return oldData;
      const list = oldData as PaymentMethod[];
      // A MODIFIED event that gains a `deletionTimestamp` is the
      // controller acknowledging a delete — evict the row now rather
      // than re-inserting it and waiting for the trailing DELETED
      // event, which otherwise flashes the card back after an
      // optimistic removal. Mirrors the billing-account watch.
      if (newItem.metadata?.deletionTimestamp) {
        return list.filter((p) => p.metadata?.name !== name);
      }
      const exists = list.some((p) => p.metadata?.name === name);
      return exists
        ? list.map((p) => (p.metadata?.name === name ? newItem : p))
        : [...list, newItem];
    },
  });
}
