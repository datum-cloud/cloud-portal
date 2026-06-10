import type { StripePaymentMethod } from '@/features/billing/types';
import { listStripeBillingMiloapisComV1Alpha1NamespacedStripePaymentMethod } from '@/modules/control-plane/stripe';
import { logger } from '@/modules/logger';
import { getOrgScopedBase } from '@/resources/base/utils';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

/**
 * `StripePaymentMethod` is the controller-managed child of a
 * `PaymentMethod`. The portal never *creates* one — Stripe's
 * provider controller does — but it does need to **read** them so
 * the add-card flow can pull `status.setupIntent.clientSecret` out
 * once the controller publishes it. We also need a watch surface
 * (in `.watch.ts`) so the dialog can wait on the child resource
 * without holding a server connection open.
 */

export const stripePaymentMethodKeys = {
  all: ['stripe-payment-methods'] as const,
  lists: () => [...stripePaymentMethodKeys.all, 'list'] as const,
  list: (orgId: string) => [...stripePaymentMethodKeys.lists(), orgId] as const,
};

const SERVICE_NAME = 'StripePaymentMethodService';

export function createStripePaymentMethodService() {
  return {
    /** List every `StripePaymentMethod` in one org's namespace. */
    async list(orgId: string): Promise<StripePaymentMethod[]> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await listStripeBillingMiloapisComV1Alpha1NamespacedStripePaymentMethod({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace },
        });
        const items = resp.data?.items ?? [];
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

export type StripePaymentMethodService = ReturnType<typeof createStripePaymentMethodService>;
