import { BackButton } from '@/components/back-button';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import {
  AssignmentsCard,
  BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION,
  BillingAddressFieldsCard,
  BillingAddressForm,
  DisplayNameFormCard,
  EmailRecipientCard,
  InvoicePreviewCard,
  PaymentMethodsCard,
  getBillingAccountDisplayName,
  type BillingAccount,
  type BillingAccountAssignment,
  type BillingAccountBinding,
  type BillingAddressValues,
  type DisplayNameFormValues,
  type EmailRecipientValues,
  type PaymentMethod,
  type ProjectBillingBinding,
} from '@/features/billing';
import type {
  AddPaymentMethodValues,
  CreatePaymentMethodResult,
} from '@/features/billing/dialogs/add-payment-method-dialog';
import { RbacProvider, usePermission } from '@/modules/rbac';
import { useApp } from '@/providers/app.provider';
import {
  createBillingAccountBindingService,
  useBillingAccountBindingsForOrgs,
} from '@/resources/billing-account-bindings';
import {
  createBillingAccountService,
  useBillingAccountWatch,
  useBillingAccountsForOrgs,
  useDeleteBillingAccount,
  useUpdateBillingAccount,
} from '@/resources/billing-accounts';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import {
  createPaymentMethodService,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethods,
  usePaymentMethodsWatch,
  type CreatePaymentMethodInput,
} from '@/resources/payment-methods';
import { createProjectService } from '@/resources/projects/project.service';
import { waitForStripePaymentMethodSetup } from '@/resources/stripe-payment-methods';
import {
  createStripeProviderConfigService,
  useStripeProviderConfigs,
} from '@/resources/stripe-provider-configs';
import { buildOrganizationNamespace, orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type LoaderFunctionArgs, type MetaFunction, data, useLoaderData } from 'react-router';

interface LoaderData {
  accountName: string;
  account: BillingAccount;
  /** Bindings — fanned out across the user's orgs (no cluster list). */
  bindings: BillingAccountBinding[];
  /** Full pre-filter bindings list, used to seed the React Query cache. */
  allBindings: BillingAccountBinding[];
  paymentMethods: PaymentMethod[];
  orgs: Array<{ name: string; displayName: string }>;
  orgIds: string[];
  projectsByOrg: Record<string, Array<{ name: string; displayName: string }>>;
  stripePublishableKey: string | undefined;
}

/**
 * User-level billing account detail page.
 *
 * Renders against real billing-service + stripe-provider APIs:
 *
 *   - The owning org is resolved from the account's namespace.
 *   - We resolve the owning org by listing the user's organization
 *     memberships and fanning out a namespaced read per org until we
 *     find the account (the IAM proxy rejects cluster-scoped billing
 *     reads, so per-org fan-out is the only working path).
 *   - Assignments are joined from the same fan-out of
 *     BillingAccountBindings; each org bucket pulls its project
 *     display names from the standard project service so the table
 *     shows the same labels as the project list.
 *   - Adding a card creates a `PaymentMethod` CRD and then waits via
 *     the SSE watch transport for the stripe-provider controller to
 *     publish the matching `StripePaymentMethod` with a SetupIntent
 *     `clientSecret`. No long-poll, no server route — the watch hub
 *     multiplexes one upstream connection per (org, namespace, kind)
 *     across every tab.
 *
 * `PastInvoicesCard` and `CreditsCard` are intentionally absent — the
 * billing API doesn't surface invoices or credits today, and rendering
 * them with placeholder data is worse than not rendering them at all.
 * They'll come back when the SDK ships matching resources.
 */
export const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const { billingAccountId } = params;
  if (!billingAccountId) {
    throw data('Billing account id is required', { status: 400 });
  }

  const orgsResult = await createOrganizationService()
    .list()
    .catch(() => ({ items: [], nextCursor: null, hasMore: false }));
  const orgIds = orgsResult.items.map((o) => o.name);

  // Per-org fan-out to find the account. The URL only has the bare
  // resource id, so we walk each org the user is in until we hit a
  // match (or fall off the end).
  const account = await createBillingAccountService()
    .findByName(billingAccountId, orgIds)
    .catch(() => null);
  if (!account) {
    throw data('Billing account not found', { status: 404 });
  }

  const namespace = account.metadata?.namespace ?? '';
  const orgId = orgIdFromNamespace(namespace);

  // Fan the remaining reads out together — they're independent and
  // the page renders meaningful partial state from any subset, so a
  // single failure doesn't blank the whole detail.
  const [allBindings, stripeConfigs, paymentMethods] = await Promise.all([
    createBillingAccountBindingService().listForOrgs(orgIds),
    createStripeProviderConfigService()
      .list()
      .catch(() => []),
    orgId ? createPaymentMethodService().list(orgId) : Promise.resolve<PaymentMethod[]>([]),
  ]);

  // For each org that has a binding to this account, hydrate the
  // project display names — fan-out is bounded by the user's
  // org-membership list so it stays small.
  const ourBindings = allBindings.filter(
    (b) =>
      b.spec?.billingAccountRef?.name === billingAccountId &&
      (!b.status?.phase || b.status.phase === 'Active')
  );
  const bindingOrgIds = new Set<string>();
  for (const binding of ourBindings) {
    const oid = orgIdFromNamespace(binding.metadata?.namespace);
    if (oid) bindingOrgIds.add(oid);
  }
  const projectsByOrg: Record<string, Array<{ name: string; displayName: string }>> = {};
  await Promise.all(
    Array.from(bindingOrgIds).map(async (oid) => {
      try {
        const list = await createProjectService().list(oid);
        projectsByOrg[oid] = list.items.map((p) => ({
          name: p.name,
          displayName: p.displayName ?? p.name,
        }));
      } catch {
        projectsByOrg[oid] = [];
      }
    })
  );

  const orgs = orgsResult.items.map((o) => ({
    name: o.name,
    displayName: o.displayName ?? o.name,
  }));

  // First StripeProviderConfig wins. This is fine while we only run a
  // single Stripe tenant; once tenant-scoped configs land we'll pick
  // via the BillingAccount's PaymentMethodClass → parametersRef chain.
  const stripePublishableKey = stripeConfigs[0]?.spec?.publishableKey ?? undefined;

  return {
    accountName: billingAccountId,
    account,
    bindings: ourBindings,
    allBindings,
    paymentMethods,
    orgs,
    orgIds,
    projectsByOrg,
    stripePublishableKey,
  };
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ data }) => {
  return metaObject(
    data?.account ? `${getBillingAccountDisplayName(data.account)} · Billing` : 'Billing'
  );
});

export const handle = {
  breadcrumb: (data: LoaderData | undefined) =>
    data?.account ? (
      <span>{getBillingAccountDisplayName(data.account)}</span>
    ) : (
      <span>Billing account</span>
    ),
  // Billing pages own their own header chrome (BackButton + PageTitle) so
  // the breadcrumb trail inherited from the parent `/account` route would
  // just add noise. The flag is checked on the active leaf only.
  hideBreadcrumb: true,
};

/**
 * Two-column section layout used by the billing page. The left column carries
 * the section title and supporting copy; the right column hosts the action
 * card(s) that the user interacts with.
 */
const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="border-border grid grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
};

/**
 * Wraps the inner page in `RbacProvider` scoped to the billing
 * account's owning org. The `/account/*` layout doesn't supply an
 * org context (the surface is intentionally cross-org), so without
 * this wrapper `usePermission` below would never resolve — it
 * derives `organizationId` from the provider, not from props.
 */
export default function AccountBillingAccountDetailPage() {
  const loaderData = useLoaderData<typeof loader>();
  const orgId = orgIdFromNamespace(loaderData.account.metadata?.namespace);
  return (
    <RbacProvider organizationId={orgId}>
      <AccountBillingAccountDetailPageInner />
    </RbacProvider>
  );
}

function AccountBillingAccountDetailPageInner() {
  const {
    accountName,
    account: initialAccount,
    allBindings: initialAllBindings,
    paymentMethods: initialPaymentMethods,
    orgs,
    orgIds: initialOrgIds,
    projectsByOrg,
    stripePublishableKey: initialPublishableKey,
  } = useLoaderData<typeof loader>();
  // The provider has the freshest user record; the detail page itself
  // doesn't need it but we pull it for parity with sibling pages that
  // surface user identity on the same chrome.
  useApp();

  const namespace = initialAccount.metadata?.namespace ?? '';
  const orgId = orgIdFromNamespace(namespace);

  // Org-scoped delete gate. Billing accounts are namespaced under
  // `organization-<orgId>` so the SSAR has to target that namespace;
  // the RbacProvider wrapper above seeds `organizationId` from the
  // resolved owning org so the hook routes the check at the right
  // control-plane base. Mirrors the DNS-zone settings gate.
  const { hasPermission: canDelete, isLoading: deleteCheckLoading } = usePermission(
    'billingaccounts',
    'delete',
    {
      group: 'billing.miloapis.com',
      namespace: orgId ? buildOrganizationNamespace(orgId) : undefined,
      scope: 'org',
      enabled: !!orgId,
    }
  );

  // Patch gate covering every editable field on this page — the
  // display-name rename *and* the billing address / contact details,
  // which all PATCH the same `billingaccounts` resource. We ask for
  // `patch` specifically — `update` would over-gate against a role
  // that can only annotate, not full-replace, the resource.
  const { hasPermission: canEditAccount, isLoading: editCheckLoading } = usePermission(
    'billingaccounts',
    'patch',
    {
      group: 'billing.miloapis.com',
      namespace: orgId ? buildOrganizationNamespace(orgId) : undefined,
      scope: 'org',
      enabled: !!orgId,
    }
  );

  // Keep the orgIds list stable for query-key derivation. Loader data
  // is referentially stable across renders but we memoize for safety
  // against future loader changes.
  const orgIds = useMemo(() => initialOrgIds, [initialOrgIds]);

  // Drive the page off live React Query caches seeded by the loader.
  // The cross-org cache is fanned out per-org because the IAM proxy
  // doesn't allow cluster-scoped billing reads; the namespaced reads
  // route through the org control-plane directly and the watch hub
  // multiplexes those subscriptions.
  const accountsQuery = useBillingAccountsForOrgs(orgIds, {
    initialData: [initialAccount],
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const bindingsQuery = useBillingAccountBindingsForOrgs(orgIds, {
    initialData: initialAllBindings,
    initialDataUpdatedAt: Date.now(),
    staleTime: QUERY_STALE_TIME,
  });
  const paymentMethodsQuery = usePaymentMethods(orgId, {
    initialData: initialPaymentMethods,
    initialDataUpdatedAt: Date.now(),
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });
  const stripeConfigsQuery = useStripeProviderConfigs({
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  // Watches scoped to the owning org. Cross-org live updates aren't
  // available (no cluster-scoped watch path), so the assignments list
  // refreshes only on navigation / mutation invalidation.
  useBillingAccountWatch(orgId, accountName);
  usePaymentMethodsWatch(orgId);

  const account =
    accountsQuery.data?.find((a) => a.metadata?.name === accountName) ?? initialAccount;
  const paymentMethods = useMemo(
    () =>
      (paymentMethodsQuery.data ?? initialPaymentMethods).filter(
        (pm) => pm.spec?.billingAccountRef?.name === accountName
      ),
    [paymentMethodsQuery.data, initialPaymentMethods, accountName]
  );
  const allBindings = bindingsQuery.data ?? initialAllBindings;
  const ourBindings = useMemo(
    () =>
      allBindings.filter(
        (b) =>
          b.spec?.billingAccountRef?.name === accountName &&
          (!b.status?.phase || b.status.phase === 'Active')
      ),
    [allBindings, accountName]
  );

  const stripePublishableKey =
    stripeConfigsQuery.data?.[0]?.spec?.publishableKey ?? initialPublishableKey;

  // Group bindings into the `{ org, projects[] }` tree the
  // assignments card renders. Org + project display names are pulled
  // from the loader-seeded lookups; cross-org rows that the watch
  // event introduces later fall back to ids until the next refresh.
  const assignments = useMemo<BillingAccountAssignment[]>(() => {
    const orgsByName = new Map(orgs.map((o) => [o.name, o]));
    const map = new Map<string, BillingAccountAssignment>();
    for (const binding of ourBindings) {
      const projectName = binding.spec?.projectRef?.name;
      const bindingOrgId = orgIdFromNamespace(binding.metadata?.namespace);
      if (!projectName || !bindingOrgId) continue;
      const orgInfo = orgsByName.get(bindingOrgId);
      const bucket = map.get(bindingOrgId) ?? {
        org: {
          name: bindingOrgId,
          displayName: orgInfo?.displayName ?? bindingOrgId,
        },
        projects: [],
      };
      const projectList = projectsByOrg[bindingOrgId] ?? [];
      const projectDisplayName =
        projectList.find((p) => p.name === projectName)?.displayName ?? projectName;
      const project: ProjectBillingBinding = {
        projectName,
        projectDisplayName,
        billingAccountName: accountName,
        orgName: bindingOrgId,
        linkedAt:
          binding.status?.billingResponsibility?.establishedAt ??
          binding.metadata?.creationTimestamp ??
          '',
      };
      bucket.projects.push(project);
      map.set(bindingOrgId, bucket);
    }
    return Array.from(map.values());
  }, [ourBindings, orgs, projectsByOrg, accountName]);

  const createPaymentMethodMutation = useCreatePaymentMethod();

  // Holds the name of a freshly-created card the user asked to make
  // the default. We can't set the default inline — the billing API
  // rejects a `defaultPaymentMethodRef` that points at a card still
  // provisioning — so we stash the intent here and apply it from an
  // effect once the watch reports the card has reached `Active`.
  const [pendingDefaultPmName, setPendingDefaultPmName] = useState<string | null>(null);

  /**
   * Create the `PaymentMethod` CRD, then wait for the stripe-provider
   * controller to publish the corresponding `StripePaymentMethod`
   * with a SetupIntent `clientSecret`. Replaces the previous
   * `POST /api/billing/payment-methods` long-poll — the wait
   * piggybacks on the SSE watch transport so we don't open extra
   * HTTP connections.
   */
  const createPaymentMethod = useCallback(
    async (
      values: AddPaymentMethodValues
    ): Promise<CreatePaymentMethodResult | null | undefined> => {
      if (!accountName || !namespace || !orgId) {
        throw new Error('Billing account is not fully loaded yet.');
      }
      const input: CreatePaymentMethodInput = {
        orgId,
        billingAccountName: accountName,
        displayName: values.displayName,
      };

      const { paymentMethodName } = await createPaymentMethodMutation.mutateAsync(input);

      // Honor the "set as default" checkbox. The card isn't Active
      // yet, so we record the intent and let the effect below apply
      // it once the controller promotes the card.
      if (values.setAsDefault) {
        setPendingDefaultPmName(paymentMethodName);
      }

      // Wait for the controller's child resource via the watch
      // transport. Times out after 30s — the controller is typically
      // sub-second but cold-starts can take a bit longer.
      const { promise, cancel } = waitForStripePaymentMethodSetup({
        orgId,
        namespace,
        paymentMethodName,
      });
      const timeout = setTimeout(() => {
        cancel();
      }, 30_000);
      try {
        const { clientSecret } = await promise;
        return { clientSecret };
      } finally {
        clearTimeout(timeout);
      }
    },
    [accountName, namespace, orgId, createPaymentMethodMutation]
  );

  const handleConfirmed = useCallback(() => {
    // The watch invalidation handles the list refresh — we don't have
    // to revalidate the loader. Just toast and let React Query do the
    // rest.
    toast.success('Card saved', {
      description: 'Your new payment method will appear once it confirms.',
    });
  }, []);

  const contactInfo = account.spec?.contactInfo;
  const address = contactInfo?.address;
  const taxIds = account.spec?.taxIds ?? [];
  // Show whatever the account currently has on file. Empty → user
  // hasn't customised the recipient list, so the controller will fall
  // back to `contactInfo.email` at send time.
  const invoiceEmails = contactInfo?.invoiceEmails ?? [];
  const displayName = getBillingAccountDisplayName(account);

  // Per-org floor for the destructive action below. We count the
  // accounts the user can actually see in this account's owning org;
  // an org with only this one account hides the delete section entirely
  // (deleting it would strip every project of its funding source). The
  // list page shares the same single-account rule.
  const ownOrgAccountCount = useMemo(() => {
    if (!orgId) return 0;
    const list = accountsQuery.data ?? [];
    return list.filter((a) => orgIdFromNamespace(a.metadata?.namespace) === orgId).length;
  }, [accountsQuery.data, orgId]);
  const isLastAccountInOrg = ownOrgAccountCount <= 1;

  const { confirm } = useConfirmationDialog();
  const deleteMutation = useDeleteBillingAccount({
    onError: (error) => {
      toast.error('Could not delete billing account', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const updateMutation = useUpdateBillingAccount({
    onError: (error) => {
      toast.error('Could not rename billing account', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleRenameAccount = useCallback(
    async (values: DisplayNameFormValues) => {
      if (!orgId) return;
      await updateMutation.mutateAsync({
        orgId,
        name: accountName,
        displayName: values.displayName,
      });
    },
    [updateMutation, orgId, accountName]
  );

  // Annotation value seeds the form. We don't fall back through the
  // wider `getBillingAccountDisplayName` chain here because the form
  // is editing the annotation specifically — surfacing the contact
  // name as a "current value" would be misleading.
  const currentDisplayNameAnnotation =
    account.metadata?.annotations?.[BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION] ?? '';

  const handleDelete = useCallback(async () => {
    if (!orgId) return;
    await confirm({
      title: 'Delete billing account',
      description: (
        <span>
          Are you sure you want to delete&nbsp;<strong>{displayName}</strong>? Any projects still
          bound to it will lose their funding source.
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await deleteMutation.mutateAsync({ orgId, name: accountName });
      },
    });
  }, [confirm, deleteMutation, orgId, accountName, displayName]);

  // Setting the default reuses the billing-account patch path — the
  // default is `spec.defaultPaymentMethodRef.name`, not a property of
  // the card itself. The hook seeds the detail cache with the updated
  // account so the "Default" badge flips as soon as the patch returns.
  const setDefaultMutation = useUpdateBillingAccount({
    onError: (error) => {
      toast.error('Could not update default payment method', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const deletePaymentMethodMutation = useDeletePaymentMethod({
    onError: (error) => {
      toast.error('Could not remove payment method', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleSetDefaultPaymentMethod = useCallback(
    (method: PaymentMethod) => {
      if (!orgId) return;
      const name = method.metadata?.name;
      if (!name) return;
      setDefaultMutation.mutate({
        orgId,
        name: accountName,
        defaultPaymentMethodName: name,
      });
    },
    [setDefaultMutation, orgId, accountName]
  );

  // Apply a deferred "set as default" once the freshly-added card
  // reaches `Active`. The watch flips its phase in-place, so this
  // effect re-runs on that transition; we clear the intent before
  // firing so a re-render mid-flight can't double-patch. First cards
  // are force-defaulted by the controller, so we skip the patch when
  // the account already points at the card.
  useEffect(() => {
    if (!pendingDefaultPmName || !orgId) return;
    const method = paymentMethods.find((pm) => pm.metadata?.name === pendingDefaultPmName);
    if (!method || method.status?.phase !== 'Active') return;
    setPendingDefaultPmName(null);
    if (account.spec?.defaultPaymentMethodRef?.name === pendingDefaultPmName) return;
    setDefaultMutation.mutate({
      orgId,
      name: accountName,
      defaultPaymentMethodName: pendingDefaultPmName,
    });
  }, [pendingDefaultPmName, paymentMethods, account, orgId, accountName, setDefaultMutation]);

  const handleRemovePaymentMethod = useCallback(
    async (method: PaymentMethod) => {
      if (!orgId) return;
      const name = method.metadata?.name;
      if (!name) return;
      await confirm({
        title: 'Remove payment method',
        description: (
          <span>
            Are you sure you want to remove&nbsp;
            <strong>{method.spec?.displayName ?? 'this card'}</strong>? Invoices funded by it will
            fall back to the account default.
          </span>
        ),
        submitText: 'Remove',
        cancelText: 'Cancel',
        variant: 'destructive',
        onSubmit: async () => {
          await deletePaymentMethodMutation.mutateAsync({ orgId, name });
        },
      });
    },
    [confirm, deletePaymentMethodMutation, orgId]
  );

  // Billing address + tax IDs. Reuses the account patch path —
  // contact/address live under `spec.contactInfo`, tax registrations
  // under `spec.taxIds`. The hook seeds the detail cache with the
  // server response so the invoice preview + field defaults stay in
  // sync after a save.
  const addressMutation = useUpdateBillingAccount({
    onSuccess: () => {
      toast.success('Billing details updated', {
        description: 'Your address and tax details will appear on upcoming invoices.',
      });
    },
    onError: (error) => {
      toast.error('Could not update billing details', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleSaveBillingAddress = useCallback(
    async (values: BillingAddressValues) => {
      if (!orgId) return;
      // Carry the existing email + invoiceEmails forward explicitly.
      // The mutation issues a JSON Merge Patch on spec.contactInfo;
      // empirically the milo billing apiserver wipes nested fields
      // we leave out of that object even though RFC 7396 would
      // preserve them, so we send the full picture on every save
      // rather than relying on server-side merge semantics.
      await addressMutation.mutateAsync({
        orgId,
        name: accountName,
        contactInfo: {
          name: values.name,
          businessName: values.businessName,
          email: contactInfo?.email,
          invoiceEmails: contactInfo?.invoiceEmails,
          address: {
            country: values.country,
            line1: values.line1,
            line2: values.line2,
            city: values.city,
            region: values.region,
            postalCode: values.postalCode,
          },
        },
        taxIds: values.taxIds,
      });
    },
    [addressMutation, orgId, accountName, contactInfo?.email, contactInfo?.invoiceEmails]
  );

  const emailsMutation = useUpdateBillingAccount({
    onSuccess: () => {
      toast.success('Invoice recipients updated', {});
    },
    onError: (error) => {
      toast.error('Could not update invoice recipients', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleSaveInvoiceEmails = useCallback(
    async (values: EmailRecipientValues) => {
      if (!orgId) return;
      // Same defensive pattern as handleSaveBillingAddress: carry the
      // existing contact + address forward so the patch doesn't drop
      // anything the user didn't touch on this card.
      await emailsMutation.mutateAsync({
        orgId,
        name: accountName,
        contactInfo: {
          name: contactInfo?.name,
          businessName: contactInfo?.businessName,
          email: contactInfo?.email,
          invoiceEmails: values.emails,
          address: contactInfo?.address,
        },
      });
    },
    [
      emailsMutation,
      orgId,
      accountName,
      contactInfo?.name,
      contactInfo?.businessName,
      contactInfo?.email,
      contactInfo?.address,
    ]
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <BackButton to={paths.account.billing.root}>Back to Billing Accounts</BackButton>
      <PageTitle title={displayName} titleClassName="text-3xl" />

      <div className="border-border border-t">
        <Section title="Name" description="Change the display name of this billing account">
          <DisplayNameFormCard
            defaultDisplayName={currentDisplayNameAnnotation}
            isSubmitting={updateMutation.isPending}
            canEdit={!editCheckLoading && canEditAccount}
            onSubmit={handleRenameAccount}
          />
          {!editCheckLoading && !canEditAccount && (
            <RestrictedOverlay message="You don't have permission to rename this billing account" />
          )}
        </Section>

        <Section
          title="Assignments"
          description="Every project funded by this billing account, grouped by the organization that owns it. The binding is set from each project's own billing settings — open a row to change or remove it.">
          <AssignmentsCard assignments={assignments} />
        </Section>

        <Section
          title="Payment methods"
          description="Payments for your subscription are made using the default card">
          <PaymentMethodsCard
            paymentMethods={paymentMethods}
            billingAccount={account}
            stripePublishableKey={stripePublishableKey}
            onCreatePaymentMethod={createPaymentMethod}
            onPaymentMethodConfirmed={handleConfirmed}
            onSetAsDefault={handleSetDefaultPaymentMethod}
            onRemove={handleRemovePaymentMethod}
          />
        </Section>

        <Section
          title="Invoice recipients"
          description="Add one or more email addresses that should receive invoices and receipts. The first entry is the primary recipient; the rest are CC'd. Leave empty to fall back to the account contact email.">
          <EmailRecipientCard
            defaultEmails={invoiceEmails}
            isSubmitting={emailsMutation.isPending}
            onSubmit={handleSaveInvoiceEmails}
          />
        </Section>

        {/* The address section reuses the page's two-column rhythm
            but owns its own `<Form.Root>` so the live invoice preview
            (rendered in the title column under the description) and
            the form fields card (rendered in the content column) sit
            on the same side of the form context — `useWatchAll`
            otherwise can't see the field values from outside the
            form. Bypasses `<Section>` because the preview lives *next
            to* the title, not inside the content column, and the
            `<form>` element itself has to be the grid container so
            its two children land in separate grid cells. */}
        <section className="border-border border-b py-8 last:border-b-0 last:pb-0">
          <BillingAddressForm
            defaultValues={{
              ...address,
              name: contactInfo?.name,
              businessName: contactInfo?.businessName,
              taxIds,
            }}
            isSubmitting={addressMutation.isPending}
            onSubmit={handleSaveBillingAddress}
            className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start md:gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-foreground text-base font-medium">Billing address & Tax IDs</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Changes will be reflected on every upcoming invoice; past invoices are not
                  affected. Tax IDs are only required for registered businesses. The invoice preview
                  updates as you type so you can see exactly how your details will appear on the
                  next invoice.
                </p>
              </div>
              <InvoicePreviewCard />
            </div>
            <div className="flex flex-col gap-4">
              <BillingAddressFieldsCard isSubmitting={addressMutation.isPending} />
              {!editCheckLoading && !canEditAccount && (
                <RestrictedOverlay message="You don't have permission to edit this billing account's details" />
              )}
            </div>
          </BillingAddressForm>
        </section>

        {/* Hide the delete affordance entirely when this is the only
            billing account the platform can see for the org — deleting
            it would strip every project of its funding source, so there's
            nothing actionable to show. A second account makes the section
            appear (and the delete enabled). */}
        {!isLastAccountInOrg && (
          <Section
            title="Danger zone"
            description="Deleting a billing account is permanent. Projects still bound to it will lose their funding source .">
            <DangerCard
              title="Delete this billing account"
              description="Cancels future invoicing on this account and detaches every bound project. The action is irreversible — past invoices stay on file, but the account itself is gone."
              deleteText="Delete billing account"
              loading={deleteMutation.isPending}
              disabled={!orgId}
              onDelete={handleDelete}
              data-e2e="delete-billing-account-button"
              actionHidden={deleteCheckLoading || !canDelete}>
              {!deleteCheckLoading && !canDelete && (
                <RestrictedOverlay message="You don't have permission to delete this billing account" />
              )}
            </DangerCard>
          </Section>
        )}
      </div>
    </div>
  );
}
