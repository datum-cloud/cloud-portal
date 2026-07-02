import {
  BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION,
  type BillingAccount,
} from '@/features/billing/types';
import {
  createBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  deleteBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  listBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  patchBillingMiloapisComV1Alpha1NamespacedBillingAccount,
  readBillingMiloapisComV1Alpha1NamespacedBillingAccount,
} from '@/modules/control-plane/billing';
import { logger } from '@/modules/logger';
import { fanOutAcrossOrgs, getOrgScopedBase } from '@/resources/base/utils';
import { slugifyBillingAccountName } from '@/resources/billing/_naming';
import { buildOrganizationNamespace } from '@/utils/common';
import { NotFoundError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';

/**
 * Input the dialog hands the create mutation. The owning org is what
 * decides which namespace we write into; everything else is mapped
 * onto `spec.contactInfo`. The currency is hardcoded to USD until we
 * expose a picker — the controller would default it to USD too, but
 * we send it explicitly so the future multi-currency dialog wires
 * straight in.
 */
export interface CreateBillingAccountInput {
  /** Org the new account belongs to — picks the target namespace. */
  orgId: string;
  /**
   * User-facing label for the account. Written to the
   * `kubernetes.io/display-name` annotation (what tables and the
   * detail page header surface) and doubles as the slug source for
   * the generated K8s `metadata.name`.
   */
  displayName: string;
  /**
   * Individual contact name — written to `spec.contactInfo.name`. The
   * dialog auto-populates this from the signed-in user's profile, so
   * the form doesn't show a separate "contact name" field anymore.
   */
  name: string;
  /** First entry doubles as `spec.contactInfo.email` server-side. */
  invoiceEmails: string[];
  businessName?: string;
  address?: {
    country: string;
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
  };
}

/**
 * Input the detail-page edit cards hand to `update`. Every property
 * is optional — only the fields the user actually touched are sent
 * up. The service patches with a JSON Merge Patch so omitted keys
 * stay untouched on the server (RFC 7396).
 */
export interface UpdateBillingAccountInput {
  /**
   * New `kubernetes.io/display-name` annotation value. Empty string
   * deliberately clears the annotation; pass `undefined` to leave it
   * alone.
   */
  displayName?: string;
  /**
   * Name of the `PaymentMethod` to set as the account default
   * (`spec.defaultPaymentMethodRef.name`). Pass `undefined` to leave
   * the current default untouched.
   */
  defaultPaymentMethodName?: string;
  /**
   * Billing contact + postal address (`spec.contactInfo`). Patched as
   * a nested object via JSON Merge Patch. In theory RFC 7396 would
   * preserve keys omitted from the patch, but the milo billing
   * apiserver empirically does not preserve nested fields on
   * partial contactInfo patches — so callers should send every
   * field they want preserved, not just the ones they're changing.
   * Pass `undefined` to leave the whole contactInfo block alone.
   */
  contactInfo?: {
    name?: string;
    businessName?: string;
    /** Primary contact email. Required server-side; preserve when patching. */
    email?: string;
    /** Invoice recipient list. Replace-all semantics — send the full list. */
    invoiceEmails?: string[];
    address?: {
      country: string;
      line1?: string;
      line2?: string;
      city?: string;
      region?: string;
      postalCode?: string;
    };
  };
  /**
   * Tax registrations (`spec.taxIds`). JSON Merge Patch treats arrays
   * as atomic, so the array sent here fully replaces the stored list —
   * which is exactly the add/edit/remove semantics the form wants.
   * Pass `undefined` to leave the list untouched.
   */
  taxIds?: Array<{ type: string; value: string }>;
}

export const billingAccountKeys = {
  all: ['billing-accounts'] as const,
  lists: () => [...billingAccountKeys.all, 'list'] as const,
  /** Namespaced list for one org. */
  list: (orgId: string) => [...billingAccountKeys.lists(), orgId] as const,
  /**
   * Multi-org list — fanned out across the supplied org ids. Sorting
   * the ids before stamping the cache key keeps the same membership
   * list from producing two caches whose order differs.
   */
  forOrgs: (orgIds: readonly string[]) =>
    [...billingAccountKeys.lists(), 'for-orgs', [...orgIds].sort().join(',')] as const,
  details: () => [...billingAccountKeys.all, 'detail'] as const,
  /** Detail key is `(orgId, name)` — needed to scope the read URL. */
  detail: (orgId: string, name: string) => [...billingAccountKeys.details(), orgId, name] as const,
};

const SERVICE_NAME = 'BillingAccountService';

export function createBillingAccountService() {
  return {
    /**
     * List the billing accounts owned by a single org. Routes through
     * the org-scoped control-plane proxy so the user only sees
     * accounts they have permission to read.
     */
    async list(orgId: string): Promise<BillingAccount[]> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await listBillingMiloapisComV1Alpha1NamespacedBillingAccount({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace },
        });
        // Filter out accounts that are being deleted. The controller
        // sets `metadata.deletionTimestamp` immediately on DELETE but
        // the resource lingers in LIST responses until finalizers run
        // (Stripe customer cleanup, etc.). Surfacing them as live
        // rows would make every delete look like it failed; we hide
        // them the same way the project listing hides projects in
        // terminating state.
        const items = (resp.data?.items ?? []).filter((a) => !a.metadata?.deletionTimestamp);
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
     * Fan-out list across the supplied org ids. The user-scoped IAM
     * proxy rejects cluster-scoped reads on `billing.miloapis.com`
     * (the API group doesn't grant cluster-list to end users), so we
     * have to hit each org's control-plane individually and
     * concatenate the results.
     *
     * Per-org failures (403 from an org the user just got removed
     * from, 404 from a still-provisioning namespace) are swallowed so
     * one bad org doesn't blank the whole list. They're logged for
     * observability instead.
     */
    listForOrgs(orgIds: readonly string[]): Promise<BillingAccount[]> {
      return fanOutAcrossOrgs(orgIds, (id) => this.list(id), { service: SERVICE_NAME });
    },

    /**
     * Read a single billing account by name when the caller doesn't
     * know which org it lives under. Fans out across the supplied
     * org ids (typically the user's full membership list) and picks
     * the first match on `metadata.name`.
     *
     * Returns the matching account; throws `NotFoundError` if none
     * of the orgs hold it (or if every org's list call failed).
     */
    async findByName(name: string, orgIds: readonly string[]): Promise<BillingAccount> {
      const startTime = Date.now();
      try {
        const all = await this.listForOrgs(orgIds);
        const account = all.find((a) => a.metadata?.name === name);
        if (!account) {
          throw new NotFoundError('BillingAccount', name);
        }
        logger.service(SERVICE_NAME, 'findByName', {
          input: { name, orgCount: orgIds.length },
          duration: Date.now() - startTime,
        });
        return account;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.findByName failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Read a single billing account by its (orgId, name) coordinate.
     * Preferred over `findByName` once the consumer knows the owning
     * org — saves the cross-namespace list.
     */
    async get(orgId: string, name: string): Promise<BillingAccount> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const resp = await readBillingMiloapisComV1Alpha1NamespacedBillingAccount({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace, name },
        });
        const account = resp.data as BillingAccount | undefined;
        if (!account) {
          throw new NotFoundError('BillingAccount', name);
        }
        logger.service(SERVICE_NAME, 'get', {
          input: { orgId, name },
          duration: Date.now() - startTime,
        });
        return account;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Create a billing account under the supplied org.
     *
     * The user-facing label (`displayName`) is the source for:
     *   - the generated K8s `metadata.name` (slugified — the
     *     controller still has the final say if the slug collides),
     *   - the `kubernetes.io/display-name` annotation that tables and
     *     the detail header surface.
     *
     * `contactInfo.name` carries the individual contact and is
     * auto-populated from the signed-in user's profile by the dialog;
     * the dialog no longer exposes it as an editable field.
     *
     * `businessName` isn't populated here — the create form keeps the
     * payload minimal and the user can fill the legal entity in from
     * the detail page once the account exists.
     */
    async create(input: CreateBillingAccountInput): Promise<BillingAccount> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(input.orgId);
        const accountName = slugifyBillingAccountName(input.displayName);
        const [primaryEmail] = input.invoiceEmails;
        const contactInfo: {
          email: string;
          name: string;
          invoiceEmails: string[];
          businessName?: string;
          address?: CreateBillingAccountInput['address'];
        } = {
          email: primaryEmail,
          name: input.name,
          invoiceEmails: input.invoiceEmails,
        };
        if (input.businessName) {
          contactInfo.businessName = input.businessName;
        }
        if (input.address) {
          contactInfo.address = input.address;
        }
        const resp = await createBillingMiloapisComV1Alpha1NamespacedBillingAccount({
          baseURL: getOrgScopedBase(input.orgId),
          path: { namespace },
          body: {
            apiVersion: 'billing.miloapis.com/v1alpha1',
            kind: 'BillingAccount',
            metadata: {
              name: accountName,
              namespace,
              annotations: {
                [BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION]: input.displayName,
              },
            },
            spec: {
              currencyCode: 'USD',
              contactInfo,
            },
          },
        });
        const created = resp.data as BillingAccount | undefined;
        if (!created) {
          throw new Error('Failed to create billing account');
        }
        logger.service(SERVICE_NAME, 'create', {
          input: { orgId: input.orgId, accountName },
          duration: Date.now() - startTime,
        });
        return created;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Patch a billing account in place. Uses JSON Merge Patch (RFC
     * 7396) so omitted fields stay untouched on the server and
     * `metadata.annotations` is merged rather than replaced. The
     * SDK's default `Content-Type` is `application/json-patch+json`
     * (RFC 6902) — we override the header so a single nested object
     * stands in for the equivalent series of `add`/`replace` ops.
     *
     * Returns the updated account so callers can seed the detail
     * cache without an extra round-trip.
     */
    async update(
      orgId: string,
      name: string,
      input: UpdateBillingAccountInput
    ): Promise<BillingAccount> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        const mergeBody: {
          metadata?: { annotations?: Record<string, string> };
          spec?: {
            defaultPaymentMethodRef?: { name: string };
            contactInfo?: UpdateBillingAccountInput['contactInfo'];
            taxIds?: UpdateBillingAccountInput['taxIds'];
          };
        } = {};
        if (input.displayName !== undefined) {
          mergeBody.metadata = {
            annotations: {
              [BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION]: input.displayName,
            },
          };
        }
        // Accumulate every spec-level change into a single `spec` block
        // so one merge patch carries the default-card switch, the
        // contact/address edits, and the tax-id list together.
        const spec: NonNullable<typeof mergeBody.spec> = {};
        if (input.defaultPaymentMethodName !== undefined) {
          spec.defaultPaymentMethodRef = { name: input.defaultPaymentMethodName };
        }
        if (input.contactInfo !== undefined) {
          spec.contactInfo = input.contactInfo;
        }
        if (input.taxIds !== undefined) {
          spec.taxIds = input.taxIds;
        }
        if (Object.keys(spec).length > 0) {
          mergeBody.spec = spec;
        }
        const resp = await patchBillingMiloapisComV1Alpha1NamespacedBillingAccount({
          baseURL: getOrgScopedBase(orgId),
          path: { namespace, name },
          // JSON Merge Patch is the simplest correct shape for
          // toggling a single annotation — RFC 6902 would need a
          // `test` + `add` dance to handle accounts that predate the
          // annotation entirely.
          headers: { 'Content-Type': 'application/merge-patch+json' },
          body: mergeBody as never,
        });
        const updated = resp.data as BillingAccount | undefined;
        if (!updated) {
          throw new Error('Failed to update billing account');
        }
        logger.service(SERVICE_NAME, 'update', {
          input: { orgId, name },
          duration: Date.now() - startTime,
        });
        return updated;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete the named billing account from the supplied org's
     * namespace. The portal enforces "every org must keep at least
     * one account" before calling this; the API still applies its
     * own safety nets (bound projects, finalizers, etc.) and any
     * 409/422 the controller raises rolls back through the standard
     * error mapper into a user-friendly toast.
     */
    async delete(orgId: string, name: string): Promise<void> {
      const startTime = Date.now();
      try {
        const namespace = buildOrganizationNamespace(orgId);
        await deleteBillingMiloapisComV1Alpha1NamespacedBillingAccount({
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

export type BillingAccountService = ReturnType<typeof createBillingAccountService>;
