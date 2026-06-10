import type { StripeProviderConfig } from '@/features/billing/types';
import { listStripeBillingMiloapisComV1Alpha1StripeProviderConfig } from '@/modules/control-plane/stripe';
import { logger } from '@/modules/logger';
import { getUserScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

/**
 * `StripeProviderConfig` is cluster-scoped today. We just need the
 * publishable key for the Stripe Elements form; once tenant-scoped
 * configs land we'll resolve the right one via the BillingAccount's
 * `PaymentMethodClass.parametersRef` chain.
 */

export const stripeProviderConfigKeys = {
  all: ['stripe-provider-configs'] as const,
  lists: () => [...stripeProviderConfigKeys.all, 'list'] as const,
  list: () => [...stripeProviderConfigKeys.lists(), 'cluster-wide'] as const,
};

const SERVICE_NAME = 'StripeProviderConfigService';

export function createStripeProviderConfigService() {
  return {
    /**
     * List every `StripeProviderConfig` the user can see. Today this
     * comes back with at most one entry — the cluster's primary
     * Stripe config — so callers typically just pick `items[0]`.
     */
    async list(): Promise<StripeProviderConfig[]> {
      const startTime = Date.now();
      try {
        const resp = await listStripeBillingMiloapisComV1Alpha1StripeProviderConfig({
          baseURL: getUserScopedBase(),
        });
        const items = resp.data?.items ?? [];
        logger.service(SERVICE_NAME, 'list', { duration: Date.now() - startTime });
        return items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type StripeProviderConfigService = ReturnType<typeof createStripeProviderConfigService>;
