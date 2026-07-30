import { invoiceKeys } from './invoice.service';
import type { Invoice } from '@/features/billing/types';
import { useResourceWatch } from '@/modules/watch';
import { buildOrganizationNamespace } from '@/utils/common';
import { useMemo } from 'react';

const RESOURCE_TYPE = 'apis/billing.miloapis.com/v1alpha1/invoices';

/**
 * Watch the invoice list for one org's namespace. Keeps the past-
 * invoices table responsive to provider updates (phase flips, totals,
 * documentUri) without refetching.
 */
export function useInvoicesWatch(orgId: string | undefined, options?: { enabled?: boolean }) {
  const queryKey = useMemo(() => invoiceKeys.list(orgId ?? ''), [orgId]);
  const namespace = useMemo(() => (orgId ? buildOrganizationNamespace(orgId) : undefined), [orgId]);

  return useResourceWatch<Invoice>({
    resourceType: RESOURCE_TYPE,
    orgId,
    namespace,
    queryKey,
    transform: (item) => item as Invoice,
    enabled: (options?.enabled ?? true) && !!orgId,
    getItemKey: (inv) => inv.metadata?.name ?? '',
    updateListCache: (oldData, newItem) => {
      if (!Array.isArray(oldData)) return oldData;
      const name = newItem.metadata?.name;
      if (!name) return oldData;
      const list = oldData as Invoice[];
      if (newItem.metadata?.deletionTimestamp) {
        return list.filter((inv) => inv.metadata?.name !== name);
      }
      const exists = list.some((inv) => inv.metadata?.name === name);
      return exists
        ? list.map((inv) => (inv.metadata?.name === name ? newItem : inv))
        : [...list, newItem];
    },
  });
}
