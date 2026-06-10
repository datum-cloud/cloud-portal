import type { BillingAccountBinding } from '@/features/billing/types';
import {
  createBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
  listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
} from '@/modules/control-plane/billing';
import { logger } from '@/modules/logger';
import { fanOutAcrossOrgs, getOrgScopedBase } from '@/resources/base/utils';
import { newBindingName } from '@/resources/billing/_naming';
import { buildOrganizationNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

/**
 * Bindings are immutable — "moving" a project to a new account means
 * creating a fresh `BillingAccountBinding`. The controller flips the
 * previous binding's `status.phase` to `Superseded` once the new one
 * reconciles, so consumers always pick the binding whose phase is
 * (absent || `Active`).
 */
export interface CreateBillingAccountBindingInput {
  /** Org that owns both the binding and the target billing account. */
  orgId: string;
  /** Project this binding charges (`spec.projectRef.name`). */
  projectName: string;
  /** Account funding the project (`spec.billingAccountRef.name`). */
  billingAccountName: string;
}

export const billingAccountBindingKeys = {
  all: ['billing-account-bindings'] as const,
  lists: () => [...billingAccountBindingKeys.all, 'list'] as const,
  /** Namespaced list for one org. */
  list: (orgId: string) => [...billingAccountBindingKeys.lists(), orgId] as const,
  /** Multi-org list — fanned out across the supplied org ids. */
  forOrgs: (orgIds: readonly string[]) =>
    [...billingAccountBindingKeys.lists(), 'for-orgs', [...orgIds].sort().join(',')] as const,
};

const SERVICE_NAME = 'BillingAccountBindingService';

export function createBillingAccountBindingService() {
  return {
    /**
     * List the bindings in one org's namespace. Includes both Active
     * and Superseded entries — consumers typically filter to Active
     * (or absent phase, i.e. newly-created) on the way out.
     */
    async list(orgId: string): Promise<BillingAccountBinding[]> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace },
        });
        // Drop tombstones so a binding mid-deletion doesn't flash back
        // into the switcher on a refetch. Mirrors the other billing
        // list services; consumers still filter to the Active phase.
        const items = (resp.data?.items ?? []).filter((b) => !b.metadata?.deletionTimestamp);
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
     * Fan-out list across the supplied org ids. Same pattern as
     * `BillingAccountService.listForOrgs` — the user-scoped IAM
     * proxy doesn't grant cluster-list on `billingaccountbindings`,
     * so we hit each org individually and concatenate.
     *
     * Per-org failures are logged but don't fail the call: that
     * means a single org rejecting the read still lets the user
     * see bindings everywhere else.
     */
    listForOrgs(orgIds: readonly string[]): Promise<BillingAccountBinding[]> {
      return fanOutAcrossOrgs(orgIds, (id) => this.list(id), { service: SERVICE_NAME });
    },

    /**
     * Create a binding. The K8s name is stamped with a millisecond
     * suffix so retries against the same (project, account) pair
     * don't collide on the immutable name.
     */
    async create(input: CreateBillingAccountBindingInput): Promise<BillingAccountBinding> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(input.orgId);
        const resp = await createBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding({
          baseURL: getOrgScopedBase(input.orgId),
          path: { namespace },
          body: {
            apiVersion: 'billing.miloapis.com/v1alpha1',
            kind: 'BillingAccountBinding',
            metadata: { name: newBindingName(input.projectName), namespace },
            spec: {
              projectRef: { name: input.projectName },
              billingAccountRef: { name: input.billingAccountName },
            },
          },
        });
        const created = resp.data as BillingAccountBinding | undefined;
        if (!created) {
          throw new Error('Failed to create billing-account binding');
        }
        logger.service(SERVICE_NAME, 'create', {
          input,
          duration: Date.now() - startTime,
        });
        return created;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type BillingAccountBindingService = ReturnType<typeof createBillingAccountBindingService>;
