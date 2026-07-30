import type { Invoice } from '@/features/billing/types';
import { listBillingMiloapisComV1Alpha1NamespacedInvoice } from '@/modules/control-plane/billing';
import { logger } from '@/modules/logger';
import { getOrgScopedBase } from '@/resources/base/utils';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  /** Per-namespace list (one org's invoices). */
  list: (orgId: string) => [...invoiceKeys.lists(), orgId] as const,
};

const SERVICE_NAME = 'InvoiceService';

/**
 * Read-only Invoice surface. Invoices are created and updated
 * exclusively by the invoicing provider — the portal only lists them
 * for the billing account detail page.
 */
export function createInvoiceService() {
  return {
    /**
     * List invoices in one org's namespace. Consumers typically filter
     * to a single `billingAccountRef.name` for the account detail page.
     */
    async list(orgId: string): Promise<Invoice[]> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await listBillingMiloapisComV1Alpha1NamespacedInvoice({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace },
        });
        // Drop tombstones. K8s sets `metadata.deletionTimestamp` on
        // DELETE immediately but keeps the resource in LIST responses
        // until finalizers run. Mirrors PaymentMethodService.list.
        const items = (resp.data?.items ?? []).filter((inv) => !inv.metadata?.deletionTimestamp);
        logger.service(SERVICE_NAME, 'list', {
          input: { orgId, namespace },
          duration: Date.now() - startTime,
        });
        return items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type InvoiceService = ReturnType<typeof createInvoiceService>;
