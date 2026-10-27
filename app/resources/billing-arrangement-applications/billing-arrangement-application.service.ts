import type { ApplicationSpec } from '@/features/billing/payment-terms';
import type { BillingArrangementApplication } from '@/features/billing/types';
import {
  createBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication,
  listBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication,
  patchBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication,
} from '@/modules/control-plane/billing';
import { logger } from '@/modules/logger';
import { getOrgScopedBase } from '@/resources/base/utils';
import { newBillingArrangementApplicationName } from '@/resources/billing/_naming';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

/**
 * What the customer fills in on the "Apply for payment terms" form. The
 * billing webhook sets `spec.applicant` from the signed-in user, so it isn't
 * sent from here.
 */
export type CreateBillingArrangementApplicationInput = {
  /** Org that owns the billing account. */
  orgId: string;
  billingAccountName: string;
} & Pick<
  ApplicationSpec,
  'paymentOption' | 'organization' | 'situation' | 'invoice' | 'authorized'
>;

export const billingArrangementApplicationKeys = {
  all: ['billing-arrangement-applications'] as const,
  lists: () => [...billingArrangementApplicationKeys.all, 'list'] as const,
  /** Per-namespace list (one org's applications). */
  list: (orgId: string) => [...billingArrangementApplicationKeys.lists(), orgId] as const,
};

const SERVICE_NAME = 'BillingArrangementApplicationService';

/**
 * Applications for payment terms. Customers create them and can withdraw a
 * pending one; staff decide them in the staff portal. Nothing else about an
 * application can change after it's submitted.
 */
export function createBillingArrangementApplicationService() {
  return {
    /** List the applications in one org's namespace, oldest first as returned. */
    async list(orgId: string): Promise<BillingArrangementApplication[]> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await listBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace },
        });
        // Applications are only deleted by staff, but drop tombstones for the
        // same reason the other billing lists do.
        const items = (resp.data?.items ?? []).filter((app) => !app.metadata?.deletionTimestamp);
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
     * Submit an application. Billing rejects it when the account lacks
     * contact details or an address, already has an application awaiting
     * review, or already has terms with no end date; `mapApiError` carries
     * the webhook's message through to the caller.
     */
    async create(
      input: CreateBillingArrangementApplicationInput
    ): Promise<BillingArrangementApplication> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(input.orgId);
        const name = newBillingArrangementApplicationName(input.billingAccountName);
        const resp = await createBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication({
          baseURL: getOrgScopedBase(input.orgId),
          path: { namespace },
          body: {
            apiVersion: 'billing.miloapis.com/v1alpha1',
            kind: 'BillingArrangementApplication',
            metadata: { name, namespace },
            spec: {
              billingAccountRef: { name: input.billingAccountName },
              paymentOption: input.paymentOption,
              organization: input.organization,
              situation: input.situation,
              invoice: input.invoice,
              authorized: input.authorized,
            },
          },
        });
        const created = resp.data as BillingArrangementApplication | undefined;
        if (!created) {
          throw new Error('Failed to submit the application');
        }
        logger.service(SERVICE_NAME, 'create', {
          input: { orgId: input.orgId, name },
          duration: Date.now() - startTime,
        });
        return created;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Withdraw a pending application by setting `spec.withdrawn`. It can't be
     * undone; the customer applies again instead. Billing rejects withdrawing
     * an application that's already been decided.
     */
    async withdraw(orgId: string, name: string): Promise<BillingArrangementApplication> {
      const startTime = Date.now();
      const withdrawPatch: { spec: Required<Pick<ApplicationSpec, 'withdrawn'>> } = {
        spec: { withdrawn: true },
      };
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await patchBillingMiloapisComV1Alpha1NamespacedBillingArrangementApplication({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace, name },
          // The SDK defaults to JSON Patch; a merge patch sets the one field.
          headers: { 'Content-Type': 'application/merge-patch+json' },
          body: withdrawPatch,
        });
        const updated = resp.data as BillingArrangementApplication | undefined;
        if (!updated) {
          throw new Error('Failed to withdraw the application');
        }
        logger.service(SERVICE_NAME, 'withdraw', {
          input: { orgId, name },
          duration: Date.now() - startTime,
        });
        return updated;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.withdraw failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type BillingArrangementApplicationService = ReturnType<
  typeof createBillingArrangementApplicationService
>;
