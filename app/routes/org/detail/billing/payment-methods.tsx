import type { OrgBillingContext } from './layout';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  BillingListUnloaded,
  PaymentMethodsCard,
  PaymentTermsCard,
  PaymentTermsPrompt,
  type BillingArrangementApplication,
  type PaymentMethod,
} from '@/features/billing';
import type {
  AddPaymentMethodValues,
  CreatePaymentMethodResult,
} from '@/features/billing/dialogs/add-payment-method-dialog';
import { latestApplication, paymentTermsSummary } from '@/features/billing/payment-terms';
import { requireBillingOwner } from '@/modules/billing/billing-access.server';
import { logger } from '@/modules/logger';
import { buildContactAddressPrefill } from '@/modules/stripe';
import { useUpdateBillingAccount } from '@/resources/billing-accounts';
import { createBillingArrangementApplicationService } from '@/resources/billing-arrangement-applications';
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
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { env } from '@/utils/env';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useOutletContext,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Payment Methods</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Payment Methods'));

interface LoaderData {
  /** Null when they couldn't be read, so the page doesn't say there are none. */
  paymentMethods: PaymentMethod[] | null;
  /** The org's applications for payment terms; the page picks the account's latest. */
  applications: BillingArrangementApplication[];
  stripePublishableKey: string | undefined;
}

export const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData> => {
  const { orgId } = params;
  await requireBillingOwner(orgId);

  // Independent reads; the tab renders meaningful partial state from any
  // subset, so one failure doesn't blank it.
  const [paymentMethods, applications, stripeConfigs] = await Promise.all([
    createPaymentMethodService()
      .list(orgId!)
      .catch((error: unknown) => {
        logger.warn('[org/billing] Could not list payment methods', {
          orgId,
          fallback: 'loaded in the browser',
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }),
    createBillingArrangementApplicationService()
      .list(orgId!)
      .catch((error: unknown): BillingArrangementApplication[] => {
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
    paymentMethods,
    applications,
    // First StripeProviderConfig wins while we run a single Stripe tenant.
    stripePublishableKey: stripeConfigs[0]?.spec?.publishableKey ?? undefined,
  };
};

/**
 * How the account pays: its cards, and payment terms when it pays by
 * invoice (or has applied to).
 */
export default function OrgBillingPaymentMethodsPage() {
  const { orgId, account, renderedAt } = useOutletContext<OrgBillingContext>();
  const {
    paymentMethods: initialPaymentMethods,
    applications,
    stripePublishableKey: initialPublishableKey,
  } = useLoaderData<typeof loader>();

  const accountName = account.metadata?.name ?? '';
  const namespace = buildOrganizationNamespace(orgId);

  // Fetched in the browser when the loader couldn't read them.
  const paymentMethodsQuery = usePaymentMethods(orgId, {
    ...(initialPaymentMethods
      ? { initialData: initialPaymentMethods, initialDataUpdatedAt: Date.now() }
      : {}),
    staleTime: QUERY_STALE_TIME,
  });
  const stripeConfigsQuery = useStripeProviderConfigs({ staleTime: QUERY_STALE_TIME });
  usePaymentMethodsWatch(orgId);

  const paymentMethods = useMemo(
    () =>
      (paymentMethodsQuery.data ?? []).filter(
        (pm) => pm.spec?.billingAccountRef?.name === accountName
      ),
    [paymentMethodsQuery.data, accountName]
  );
  const stripePublishableKey =
    stripeConfigsQuery.data?.[0]?.spec?.publishableKey ?? initialPublishableKey;

  const contactInfo = account.spec?.contactInfo;
  const paymentTerms = paymentTermsSummary(account, renderedAt);
  const paymentTermsApplication = useMemo(
    () => latestApplication(applications, accountName),
    [applications, accountName]
  );
  // Owners apply for payment terms, only while PAYMENT_TERMS_ENABLED is on.
  // The layout already required the user to own the org.
  const canApplyForPaymentTerms = env.public.paymentTermsEnabled;

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

  return (
    <div className="flex flex-col gap-4">
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
      {paymentMethodsQuery.data ? (
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
          emptyMessage={paymentTerms ? 'No card on file. This account pays by invoice.' : undefined}
        />
      ) : (
        <BillingListUnloaded
          what="payment methods"
          isError={paymentMethodsQuery.isError}
          onRetry={() => void paymentMethodsQuery.refetch()}
        />
      )}
    </div>
  );
}
