import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  BillingDetailsCard,
  ContractCard,
  DiscountsCard,
  PastInvoicesCard,
  PaymentMethodsCard,
  PaymentTermsCard,
  PaymentTermsPrompt,
  PricingCard,
  accountDiscounts,
  contractSummary,
  getBillingAccountDisplayName,
  isStaleInvoice,
  priceList,
  selectDefaultOrgBillingAccount,
  summarizeDiscounts,
  toPastInvoiceRow,
  type BillingAccount,
  type BillingArrangementApplication,
  type BillingDetailsValues,
  type Invoice,
  type PastInvoiceRow,
  type PaymentMethod,
} from '@/features/billing';
import type {
  AddPaymentMethodValues,
  CreatePaymentMethodResult,
} from '@/features/billing/dialogs/add-payment-method-dialog';
import { latestApplication, paymentTermsSummary } from '@/features/billing/payment-terms';
import { requireBillingOwner } from '@/modules/billing/billing-access.server';
import { logger } from '@/modules/logger';
import { usePermission } from '@/modules/rbac';
import { buildContactAddressPrefill } from '@/modules/stripe';
import {
  createBillingAccountService,
  useBillingAccounts,
  useBillingAccountsWatch,
  useUpdateBillingAccount,
} from '@/resources/billing-accounts';
import { createBillingArrangementApplicationService } from '@/resources/billing-arrangement-applications';
import { createInvoiceService, useInvoices, useInvoicesWatch } from '@/resources/invoices';
import {
  createPaymentMethodService,
  useCreatePaymentMethod,
  useDeletePaymentMethod,
  usePaymentMethods,
  usePaymentMethodsWatch,
  type CreatePaymentMethodInput,
} from '@/resources/payment-methods';
import { waitForStripePaymentMethodSetup } from '@/resources/stripe-payment-methods';
import {
  createStripeProviderConfigService,
  useStripeProviderConfigs,
} from '@/resources/stripe-provider-configs';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { env } from '@/utils/env';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  Link,
  redirect,
  useLoaderData,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Billing'));

interface LoaderData {
  orgId: string;
  account: BillingAccount;
  accounts: BillingAccount[];
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  /** The account's most recent application for payment terms. */
  paymentTermsApplication: BillingArrangementApplication | undefined;
  /** When the loader ran, so server and browser agree on terms ending soon. */
  renderedAt: number;
  stripePublishableKey: string | undefined;
}

/**
 * The organization's billing account.
 *
 * Each org has one billing account, so this page is that account: its
 * details, what it's billed at, how it pays and its invoices. Only the org's
 * owners reach it (the billing layout enforces the same rule). An org that
 * hasn't set billing up yet goes to the billing step of setup instead.
 */
export const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const { orgId } = params;
  await requireBillingOwner(orgId);
  if (!orgId) throw redirect(paths.account.root);

  const accounts = await createBillingAccountService().list(orgId);
  const account = selectDefaultOrgBillingAccount(accounts);
  if (!account?.metadata?.name) {
    throw redirect(`${paths.onboarding.billing}?orgId=${encodeURIComponent(orgId)}`);
  }
  const accountName = account.metadata.name;

  // Independent reads; the page renders meaningful partial state from any
  // subset, so one failure doesn't blank it.
  const [paymentMethods, invoices, applications, stripeConfigs] = await Promise.all([
    createPaymentMethodService()
      .list(orgId)
      .catch(() => [] as PaymentMethod[]),
    createInvoiceService()
      .list(orgId)
      .catch(() => [] as Invoice[]),
    createBillingArrangementApplicationService()
      .list(orgId)
      .catch((error): BillingArrangementApplication[] => {
        logger.warn('[org/billing] Could not list payment terms applications', {
          orgId,
          fallback: 'no application shown',
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }),
    createStripeProviderConfigService()
      .list()
      .catch(() => []),
  ]);

  return {
    orgId,
    account,
    accounts,
    paymentMethods,
    invoices,
    paymentTermsApplication: latestApplication(applications, accountName),
    renderedAt: Date.now(),
    // First StripeProviderConfig wins while we run a single Stripe tenant.
    stripePublishableKey: stripeConfigs[0]?.spec?.publishableKey ?? undefined,
  };
};

/**
 * Two-column section: the title and supporting copy on the left, the card(s)
 * on the right.
 */
const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="border-border grid grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
    <div className="flex flex-col gap-2">
      <Title as="h2" level={6} weight="medium" textColor="default">
        {title}
      </Title>
      <Text as="p" textColor="muted" className="leading-relaxed">
        {description}
      </Text>
    </div>
    <div className="flex flex-col gap-4">{children}</div>
  </section>
);

export default function OrgBillingPage() {
  const {
    orgId,
    account: initialAccount,
    accounts: initialAccounts,
    paymentMethods: initialPaymentMethods,
    invoices: initialInvoices,
    paymentTermsApplication,
    renderedAt,
    stripePublishableKey: initialPublishableKey,
  } = useLoaderData<typeof loader>();

  const accountName = initialAccount.metadata?.name ?? '';
  const namespace = buildOrganizationNamespace(orgId);

  // Every editable field on the page PATCHes the billingaccounts resource.
  // `patch` rather than `update` so a role that can only patch isn't
  // over-gated.
  const { hasPermission: canEditAccount, isLoading: editCheckLoading } = usePermission(
    'billingaccounts',
    'patch',
    { group: 'billing.miloapis.com', namespace, scope: 'org' }
  );

  // Live caches seeded by the loader; the watches keep them fresh.
  const accountsQuery = useBillingAccounts(orgId, {
    initialData: initialAccounts,
    initialDataUpdatedAt: Date.now(),
    staleTime: QUERY_STALE_TIME,
  });
  const paymentMethodsQuery = usePaymentMethods(orgId, {
    initialData: initialPaymentMethods,
    initialDataUpdatedAt: Date.now(),
    staleTime: QUERY_STALE_TIME,
  });
  const invoicesQuery = useInvoices(orgId, {
    initialData: initialInvoices,
    initialDataUpdatedAt: Date.now(),
    staleTime: QUERY_STALE_TIME,
  });
  const stripeConfigsQuery = useStripeProviderConfigs({ staleTime: QUERY_STALE_TIME });

  useBillingAccountsWatch(orgId);
  usePaymentMethodsWatch(orgId);
  useInvoicesWatch(orgId);

  const account =
    accountsQuery.data?.find((a) => a.metadata?.name === accountName) ?? initialAccount;
  const paymentMethods = useMemo(
    () =>
      (paymentMethodsQuery.data ?? initialPaymentMethods).filter(
        (pm) => pm.spec?.billingAccountRef?.name === accountName
      ),
    [paymentMethodsQuery.data, initialPaymentMethods, accountName]
  );
  const pastInvoices = useMemo(
    () =>
      (invoicesQuery.data ?? initialInvoices)
        .filter((inv) => inv.spec?.billingAccountRef?.name === accountName && !isStaleInvoice(inv))
        .map(toPastInvoiceRow),
    [invoicesQuery.data, initialInvoices, accountName]
  );
  const stripePublishableKey =
    stripeConfigsQuery.data?.[0]?.spec?.publishableKey ?? initialPublishableKey;

  const contactInfo = account.spec?.contactInfo;
  const contract = contractSummary(account, renderedAt);
  // One list of what the account pays: the contract's fees, any other plan
  // fees and the usage rates.
  const prices = useMemo(() => priceList(account, contract), [account, contract]);
  // Billing releases before `status.prices` only publish discounts.
  const pricesPublished = (account.status?.prices?.length ?? 0) > 0;
  const discounts = useMemo(() => accountDiscounts(account), [account]);
  const paymentTerms = paymentTermsSummary(account, renderedAt);
  // Owners apply for payment terms, only while PAYMENT_TERMS_ENABLED is on.
  // The loader already required the user to own the org.
  const canApplyForPaymentTerms = env.public.paymentTermsEnabled;

  // ─── Billing details ──────────────────────────────────────────────────
  const detailsMutation = useUpdateBillingAccount({
    onSuccess: () => {
      toast.success('Billing details updated', {
        description: 'Changes show on upcoming invoices.',
      });
    },
    onError: (error) => {
      toast.error('Could not update billing details', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleSaveDetails = useCallback(
    async (values: BillingDetailsValues) => {
      const invoiceEmail = values.invoiceEmail?.trim().toLowerCase();
      // Send the whole contact block: billing drops nested contactInfo fields
      // a patch leaves out, so the existing email is carried forward.
      await detailsMutation.mutateAsync({
        orgId,
        name: accountName,
        displayName: values.displayName,
        contactInfo: {
          name: values.name,
          businessName: values.businessName,
          email: contactInfo?.email,
          invoiceEmails: invoiceEmail ? [invoiceEmail] : [],
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
    [detailsMutation, orgId, accountName, contactInfo?.email]
  );

  // ─── Payment methods ──────────────────────────────────────────────────
  const createPaymentMethodMutation = useCreatePaymentMethod();

  // A freshly added card the user asked to make the default. The billing
  // API rejects a default that points at a card still provisioning, so the
  // intent waits here until the watch reports the card `Active`.
  const [pendingDefaultPmName, setPendingDefaultPmName] = useState<string | null>(null);

  /**
   * Create the `PaymentMethod`, then wait for stripe-provider to publish the
   * matching `StripePaymentMethod` with a SetupIntent client secret.
   */
  const createPaymentMethod = useCallback(
    async (
      values: AddPaymentMethodValues
    ): Promise<CreatePaymentMethodResult | null | undefined> => {
      const input: CreatePaymentMethodInput = {
        orgId,
        billingAccountName: accountName,
        displayName: values.displayName,
      };
      const { paymentMethodName } = await createPaymentMethodMutation.mutateAsync(input);
      if (values.setAsDefault) {
        setPendingDefaultPmName(paymentMethodName);
      }
      const { promise, cancel } = waitForStripePaymentMethodSetup({
        orgId,
        namespace,
        paymentMethodName,
      });
      const timeout = setTimeout(cancel, 30_000);
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
    toast.success('Card saved', {
      description: 'Your new payment method will appear once it confirms.',
    });
  }, []);

  // The default card is the account's `spec.defaultPaymentMethodRef`.
  const setDefaultMutation = useUpdateBillingAccount({
    onError: (error) => {
      toast.error('Could not update default payment method', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleSetDefaultPaymentMethod = useCallback(
    (method: PaymentMethod) => {
      const name = method.metadata?.name;
      if (!name) return;
      setDefaultMutation.mutate({ orgId, name: accountName, defaultPaymentMethodName: name });
    },
    [setDefaultMutation, orgId, accountName]
  );

  // Apply a deferred "set as default" once the new card reaches `Active`.
  // The first card is made the default by the controller, so skip the patch
  // when the account already points at it.
  useEffect(() => {
    if (!pendingDefaultPmName) return;
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

  const { confirm } = useConfirmationDialog();
  const deletePaymentMethodMutation = useDeletePaymentMethod({
    onError: (error) => {
      toast.error('Could not remove payment method', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const handleRemovePaymentMethod = useCallback(
    async (method: PaymentMethod) => {
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

  const handleDownloadInvoice = useCallback((invoice: PastInvoiceRow) => {
    if (!invoice.downloadUrl) return;
    window.open(invoice.downloadUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const usageLink = (
    <Link
      to={getPathWithParams(paths.org.detail.usage, { orgId })}
      className="text-primary hover:text-primary/80 font-medium">
      See this period&apos;s usage
    </Link>
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle
        title="Billing"
        description={getBillingAccountDisplayName(account)}
        titleClassName="text-3xl"
      />

      <div className="border-border border-t">
        <Section
          title="Billing details"
          description="Who's billed and where invoices go. Changes show on upcoming invoices; past invoices aren't affected.">
          <BillingDetailsCard
            account={account}
            canEdit={!editCheckLoading && canEditAccount}
            isSubmitting={detailsMutation.isPending}
            onSubmit={handleSaveDetails}
          />
        </Section>

        {prices ? (
          <Section
            title="Pricing"
            description="Everything this account is charged for, with your discounts: each fee and the rate for each kind of usage. To change your plan or contract, contact support.">
            <PricingCard items={prices} usageLink={usageLink} />
          </Section>
        ) : null}

        {!pricesPublished && summarizeDiscounts(discounts) ? (
          <Section
            title="Discounts"
            description="Discounts that apply to this billing account's usage.">
            <DiscountsCard discounts={discounts} />
          </Section>
        ) : null}

        {contract ? (
          <Section
            title="Contract"
            description="The contract this account is billed under, set up with our team. To change it, contact support.">
            <ContractCard contract={contract} />
          </Section>
        ) : null}

        <Section
          title="Payment methods"
          description={
            paymentTerms
              ? 'This account pays by invoice under the payment terms our team approved. To change them, contact support.'
              : 'Invoices are charged to the default card.'
          }>
          {/* Terms in effect or an application under review. Renders
              nothing otherwise. */}
          <PaymentTermsCard
            orgId={orgId}
            billingAccountName={accountName}
            terms={paymentTerms}
            application={paymentTermsApplication}
            currency={account.spec?.currencyCode ?? 'USD'}
            canApply={canApplyForPaymentTerms}
            now={renderedAt}
          />
          <PaymentMethodsCard
            footerNote={
              paymentTerms ? undefined : (
                <PaymentTermsPrompt
                  orgId={orgId}
                  billingAccountName={accountName}
                  application={paymentTermsApplication}
                  canApply={canApplyForPaymentTerms}
                />
              )
            }
            paymentMethods={paymentMethods}
            billingAccount={account}
            stripePublishableKey={stripePublishableKey}
            billingDetailsPrefill={{
              email: contactInfo?.email,
              name: contactInfo?.name,
              address: buildContactAddressPrefill(contactInfo?.address),
            }}
            onCreatePaymentMethod={createPaymentMethod}
            onPaymentMethodConfirmed={handleConfirmed}
            onSetAsDefault={handleSetDefaultPaymentMethod}
            onRemove={handleRemovePaymentMethod}
            emptyMessage={
              paymentTerms ? 'No card on file. This account pays by invoice.' : undefined
            }
          />
        </Section>

        <Section title="Invoices" description="Past invoices for this organization.">
          <PastInvoicesCard invoices={pastInvoices} onDownload={handleDownloadInvoice} />
        </Section>
      </div>
    </div>
  );
}
