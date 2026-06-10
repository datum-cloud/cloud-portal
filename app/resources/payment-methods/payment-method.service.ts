import type { PaymentMethod } from '@/features/billing/types';
import {
  createBillingMiloapisComV1Alpha1NamespacedPaymentMethod,
  deleteBillingMiloapisComV1Alpha1NamespacedPaymentMethod,
  listBillingMiloapisComV1Alpha1NamespacedPaymentMethod,
} from '@/modules/control-plane/billing';
import { logger } from '@/modules/logger';
import { fanOutAcrossOrgs, getOrgScopedBase } from '@/resources/base/utils';
import { newPaymentMethodName } from '@/resources/billing/_naming';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

/**
 * Input for creating a `PaymentMethod` CRD. The provider controller
 * (Stripe today) reacts to this resource and asynchronously
 * publishes a child `StripePaymentMethod` carrying the SetupIntent
 * `clientSecret`. The dialog watches for that child via
 * `waitForStripePaymentMethodSetup` (in `app/resources/stripe-payment-methods`)
 * to complete the flow.
 */
export interface CreatePaymentMethodInput {
  /** Org that owns the billing account this card backs. */
  orgId: string;
  /** Account the new method is attached to (`spec.billingAccountRef.name`). */
  billingAccountName: string;
  /** Human label rendered in the cards list (`spec.displayName`). */
  displayName?: string;
}

/**
 * Result of the create mutation. The caller has the K8s name needed
 * to find the matching `StripePaymentMethod` child once the
 * controller catches up.
 */
export interface CreatePaymentMethodResult {
  paymentMethod: PaymentMethod;
  paymentMethodName: string;
}

export const paymentMethodKeys = {
  all: ['payment-methods'] as const,
  lists: () => [...paymentMethodKeys.all, 'list'] as const,
  /** Per-namespace list (one org's payment methods). */
  list: (orgId: string) => [...paymentMethodKeys.lists(), orgId] as const,
  /** Multi-org list — fanned out across the supplied org ids. */
  forOrgs: (orgIds: readonly string[]) =>
    [...paymentMethodKeys.lists(), 'for-orgs', [...orgIds].sort().join(',')] as const,
};

const SERVICE_NAME = 'PaymentMethodService';

export function createPaymentMethodService() {
  return {
    /**
     * List the payment methods in one org's namespace. Returns every
     * PM under the namespace — consumers typically filter to one
     * `billingAccountRef.name` for a single-account detail page.
     */
    async list(orgId: string): Promise<PaymentMethod[]> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await listBillingMiloapisComV1Alpha1NamespacedPaymentMethod({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace },
        });
        // Drop tombstones. K8s sets `metadata.deletionTimestamp` on
        // DELETE immediately but keeps the resource in LIST responses
        // until finalizers run — surfacing those would make a removed
        // card flash back into the list on the post-delete refetch.
        // Mirrors `BillingAccountService.list`.
        const items = (resp.data?.items ?? []).filter((pm) => !pm.metadata?.deletionTimestamp);
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

    /**
     * Fan-out list across the supplied org ids — powers the
     * cross-org default-payment-method column on the user-level
     * billing list. Per-org failures are tolerated for the same
     * reasons noted on `BillingAccountService.listForOrgs`.
     */
    listForOrgs(orgIds: readonly string[]): Promise<PaymentMethod[]> {
      return fanOutAcrossOrgs(orgIds, (id) => this.list(id), { service: SERVICE_NAME });
    },

    /**
     * Create a `PaymentMethod`. This kicks off the provider flow —
     * the stripe-provider controller will publish a child
     * `StripePaymentMethod` with a SetupIntent `clientSecret` for
     * the dialog to complete in the browser.
     */
    async create(input: CreatePaymentMethodInput): Promise<CreatePaymentMethodResult> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(input.orgId);
        const name = newPaymentMethodName(input.displayName);
        const resp = await createBillingMiloapisComV1Alpha1NamespacedPaymentMethod({
          baseURL: getOrgScopedBase(input.orgId),
          path: { namespace },
          body: {
            apiVersion: 'billing.miloapis.com/v1alpha1',
            kind: 'PaymentMethod',
            metadata: { name, namespace },
            spec: {
              billingAccountRef: { name: input.billingAccountName },
              displayName: input.displayName ?? 'New card',
            },
          },
        });
        const created = resp.data as PaymentMethod | undefined;
        if (!created) {
          throw new Error('Failed to create payment method');
        }
        logger.service(SERVICE_NAME, 'create', {
          input: { orgId: input.orgId, name },
          duration: Date.now() - startTime,
        });
        return { paymentMethod: created, paymentMethodName: name };
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete a `PaymentMethod` from the org's namespace. The billing
     * API guards against removing an account's default card with a
     * deletion-guard webhook, so callers should move the default
     * elsewhere first; any 409/422 the controller raises rolls back
     * through `mapApiError` into a user-friendly toast.
     */
    async delete(orgId: string, name: string): Promise<void> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        await deleteBillingMiloapisComV1Alpha1NamespacedPaymentMethod({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace, name },
        });
        logger.service(SERVICE_NAME, 'delete', {
          input: { orgId, name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type PaymentMethodService = ReturnType<typeof createPaymentMethodService>;
