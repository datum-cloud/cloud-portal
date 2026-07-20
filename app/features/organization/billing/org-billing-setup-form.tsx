import { CardBrandIcon } from '@/features/billing/components/card-brand-icon';
import { CARD_BRAND_LABELS } from '@/features/billing/constants';
import { AddPaymentMethodDialog } from '@/features/billing/dialogs/add-payment-method-dialog';
import { normalizeCardBrand, type CardBrand } from '@/features/billing/types';
import { useSetupOnboardingBilling } from '@/features/onboarding/billing/use-setup-onboarding-billing';
import { OrgContactInfoDialog } from '@/features/onboarding/dialogs/org-contact-info-dialog';
import {
  buildOrgContactDefaults,
  formatOrgContactPrimaryLine,
  formatOrgContactSecondaryLine,
  isOrgContactInfoComplete,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { logger } from '@/modules/logger';
import {
  buildContactAddressPrefill,
  type AddPaymentMethodValues,
  type StripePaymentMethodConfirmedDetails,
} from '@/modules/stripe';
import { useUpdateBillingAccount } from '@/resources/billing-accounts';
import {
  useCreatePaymentMethod,
  waitForPaymentMethodActive,
  waitForPaymentMethodCard,
  type CreatePaymentMethodInput,
} from '@/resources/payment-methods';
import { waitForStripePaymentMethodSetup } from '@/resources/stripe-payment-methods';
import { useStripePublishableKey } from '@/resources/stripe-provider-configs';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ClockIcon, CheckIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

/** How long to wait for the provider to publish card brand/last4 after confirm. */
const CARD_DETAILS_TIMEOUT_MS = 30_000;

interface PaymentMethodSummary {
  brand: CardBrand;
  last4: string;
  label: string;
}

function buildPaymentSummary(
  brand: string | null | undefined,
  last4: string
): PaymentMethodSummary {
  const normalizedBrand = normalizeCardBrand(brand);
  return {
    brand: normalizedBrand,
    last4,
    label: `${CARD_BRAND_LABELS[normalizedBrand]} ✸✸✸✸ ${last4}`,
  };
}

export interface OrgBillingSetupFormProps {
  stripePublishableKey?: string;
  contactDefaults: Partial<OrgContactInfoValues>;
  initialSetup?: {
    orgId: string;
    accountName: string;
    namespace: string;
  };
  initialContactInfo?: OrgContactInfoValues;
  /** Existing active card on the account, so resume shows it as already added. */
  initialPaymentSummary?: { brand?: string | null; last4: string };
  /** Org exists from a prior partial setup — billing account create will be retried. */
  partialOrgId?: string;
  /**
   * Show an explicit "Organization name" field at the top of the form. Used by
   * the standalone create-org flow so the user can name the org directly;
   * omitted in onboarding, where the name is derived from contact details.
   */
  showDisplayNameField?: boolean;
  submitLabel?: string;
  /**
   * Fired the first time this form session obtains a complete org + billing
   * account (fresh create or finishing a `partialOrgId`). Does not fire when
   * editing an already-loaded `initialSetup`, so callers can clean up a
   * half-finished org or kick off follow-on work (e.g. default project) once.
   */
  onOrgProvisioned?: (setup: {
    orgId: string;
    accountName: string;
    namespace: string;
    contactInfo: OrgContactInfoValues;
  }) => void;
  onComplete?: (result: {
    orgId: string;
    accountName: string;
    contactInfo: OrgContactInfoValues;
  }) => void | Promise<void>;
}

export const OrgBillingSetupForm = ({
  stripePublishableKey: initialStripePublishableKey,
  contactDefaults,
  initialSetup,
  initialContactInfo,
  initialPaymentSummary,
  partialOrgId,
  showDisplayNameField = false,
  submitLabel = 'Continue',
  onOrgProvisioned,
  onComplete,
}: OrgBillingSetupFormProps) => {
  const [contactInfo, setContactInfo] = useState<OrgContactInfoValues | null>(
    initialContactInfo ?? null
  );
  const [displayName, setDisplayName] = useState('');
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentMethodSummary | null>(
    initialPaymentSummary?.last4
      ? buildPaymentSummary(initialPaymentSummary.brand, initialPaymentSummary.last4)
      : null
  );
  const [isPaymentMethodPending, setIsPaymentMethodPending] = useState(false);
  const [billingSetup, setBillingSetup] = useState<{
    orgId: string;
    accountName: string;
    namespace: string;
  } | null>(initialSetup ?? null);
  const [isCompleting, setIsCompleting] = useState(false);

  const stripeKeyQuery = useStripePublishableKey({
    initialPublishableKey: initialStripePublishableKey,
  });
  const stripePublishableKey = stripeKeyQuery.publishableKey;
  const stripeKeyLoading = !stripePublishableKey && stripeKeyQuery.isFetching;
  const stripeKeyUnavailable =
    !stripePublishableKey && stripeKeyQuery.isFetched && !stripeKeyQuery.isFetching;

  const setupBillingMutation = useSetupOnboardingBilling({
    onError: (error) => {
      toast.error('Contact information', {
        description: error.message ?? 'Failed to set up organization billing',
      });
    },
  });

  const createPaymentMethodMutation = useCreatePaymentMethod();
  const setDefaultPaymentMethodMutation = useUpdateBillingAccount();

  const orgId = billingSetup?.orgId;
  const accountName = billingSetup?.accountName;
  const namespace = billingSetup?.namespace;

  // Name of the `PaymentMethod` we just created, stashed so the confirm
  // handler knows which resource to watch for card details.
  const pendingPaymentMethodNameRef = useRef<string | null>(null);

  const applyPaymentSummary = useCallback((brand: string | null | undefined, last4: string) => {
    setPaymentSummary(buildPaymentSummary(brand, last4));
    setIsPaymentMethodPending(false);
  }, []);

  const handlePaymentConfirmed = useCallback(
    (details?: StripePaymentMethodConfirmedDetails) => {
      setPaymentDialogOpen(false);

      const paymentMethodName = pendingPaymentMethodNameRef.current;

      // Fill the card chip. Fast path: on the rare occasion Stripe hands
      // back an expanded payment method, use its brand/last4 immediately.
      // Otherwise the confirm response only carried an unexpanded payment
      // method id — the authoritative brand/last4 land on the
      // `PaymentMethod.status.details.card` once the provider processes
      // `payment_method.attached`, so watch for them and fill the chip in
      // when they arrive.
      if (details?.last4) {
        applyPaymentSummary(details.brand, details.last4);
      } else if (orgId && namespace && paymentMethodName) {
        setIsPaymentMethodPending(true);
        const { promise, cancel } = waitForPaymentMethodCard({
          orgId,
          namespace,
          paymentMethodName,
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            cancel();
            reject(new Error('Timed out waiting for card details'));
          }, CARD_DETAILS_TIMEOUT_MS);
        });
        Promise.race([promise, timeout])
          .then((card) => applyPaymentSummary(card.brand, card.last4))
          .catch((error) => {
            logger.warn('Could not resolve card details for the new payment method', {
              error: error instanceof Error ? error.message : String(error),
            });
          })
          .finally(() => {
            if (timer) clearTimeout(timer);
            setIsPaymentMethodPending(false);
          });
      }

      // Make this card the account's default. The billing API only accepts
      // a `defaultPaymentMethodRef` once the card has reached `Active`, so
      // wait for that phase before patching. This is the first (and only)
      // card on a freshly created account — the controller force-defaults
      // the first card too, which makes this patch a harmless no-op if it
      // beat us to it, and a guarantee if it didn't.
      if (orgId && namespace && accountName && paymentMethodName) {
        const { promise, cancel } = waitForPaymentMethodActive({
          orgId,
          namespace,
          paymentMethodName,
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            cancel();
            reject(new Error('Timed out waiting for card to activate'));
          }, CARD_DETAILS_TIMEOUT_MS);
        });
        Promise.race([promise, timeout])
          .then(() =>
            setDefaultPaymentMethodMutation.mutateAsync({
              orgId,
              name: accountName,
              defaultPaymentMethodName: paymentMethodName,
            })
          )
          .catch((error) => {
            logger.warn('Could not set the new card as the default payment method', {
              error: error instanceof Error ? error.message : String(error),
            });
          })
          .finally(() => {
            if (timer) clearTimeout(timer);
          });
      }
    },
    [applyPaymentSummary, orgId, namespace, accountName, setDefaultPaymentMethodMutation]
  );

  const createPaymentMethod = useCallback(
    async (values: AddPaymentMethodValues) => {
      if (!orgId || !accountName || !namespace) {
        throw new Error('Billing account is not ready yet');
      }

      const input: CreatePaymentMethodInput = {
        orgId,
        billingAccountName: accountName,
        displayName: values.displayName,
      };

      const { paymentMethodName } = await createPaymentMethodMutation.mutateAsync(input);
      pendingPaymentMethodNameRef.current = paymentMethodName;

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
    [orgId, accountName, namespace, createPaymentMethodMutation]
  );

  const billingReady = Boolean(billingSetup);
  const contactComplete = isOrgContactInfoComplete(contactInfo) && billingReady;
  const paymentComplete = paymentSummary !== null;
  const canSubmit =
    contactComplete && paymentComplete && stripePublishableKey && !isPaymentMethodPending;

  const contactDialogDefaults = useMemo(
    () => buildOrgContactDefaults({ ...contactDefaults, ...(contactInfo ?? {}) }),
    [contactDefaults, contactInfo]
  );

  const billingDetailsPrefill = useMemo(() => {
    const source = contactInfo ?? contactDialogDefaults;
    if (!source.email?.trim()) return undefined;
    const fullAddress = buildContactAddressPrefill(source);
    const countryOnly = source.country?.trim();
    return {
      email: source.email.trim(),
      // Card billing address uses the contact's personal name, not the org or business name.
      name: source.name?.trim() || undefined,
      // Prefer a full address when present; otherwise pass country alone so the
      // Address Element can expand all fields on mount.
      address: fullAddress ?? (countryOnly ? { country: countryOnly } : undefined),
    };
  }, [contactInfo, contactDialogDefaults]);

  const handleContactSave = async (values: OrgContactInfoValues) => {
    // First complete setup this session: no billingSetup yet (fresh create or
    // finishing a partialOrgId). Editing an already-loaded setup is a no-op for
    // onOrgProvisioned so follow-on work (project kickoff / orphan tracking)
    // only runs once.
    const isFirstCompleteSetup = !billingSetup;
    const setup = await setupBillingMutation.mutateAsync({
      contactInfo: values,
      displayNameOverride: showDisplayNameField ? displayName : undefined,
      existingOrgId: billingSetup ? undefined : partialOrgId,
      existingSetup: billingSetup ?? undefined,
    });
    setContactInfo(values);
    setBillingSetup(setup);
    if (isFirstCompleteSetup) {
      onOrgProvisioned?.({ ...setup, contactInfo: values });
    }
  };

  const handleSubmit = async () => {
    if (
      !billingSetup?.orgId ||
      !billingSetup.accountName ||
      !canSubmit ||
      !contactInfo ||
      isCompleting
    ) {
      return;
    }

    setIsCompleting(true);
    try {
      await onComplete?.({
        orgId: billingSetup.orgId,
        accountName: billingSetup.accountName,
        contactInfo,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {showDisplayNameField ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="org-display-name"
              className="text-foreground text-xs font-semibold opacity-80">
              Organization name
            </label>
            <Input
              id="org-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="e.g. Acme Corp"
              autoComplete="off"
              disabled={billingReady}
              maxLength={256}
              data-e2e="create-organization-display-name"
            />
            {!billingReady ? (
              <p className="text-foreground text-1xs font-normal opacity-60">
                A friendly name for the organization. Defaults to your business or contact name if
                left blank.
              </p>
            ) : null}
          </div>
        ) : null}

        <VerificationField
          label="Contact information"
          isEmpty={!contactComplete}
          openE2e="org-billing-contact-open"
          onOpen={() => setContactDialogOpen(true)}>
          {contactComplete && contactInfo ? (
            <div className="flex min-w-0 flex-col gap-1 text-left">
              <p className="text-foreground text-[13px] leading-[18px] font-medium break-words">
                {formatOrgContactPrimaryLine(contactInfo)}
              </p>
              <p className="text-muted-foreground text-xs leading-4 break-words opacity-60">
                {formatOrgContactSecondaryLine(contactInfo)}
              </p>
            </div>
          ) : null}
        </VerificationField>

        {stripeKeyLoading ? (
          <StripePaymentLoading />
        ) : stripeKeyUnavailable ? (
          <UnconfiguredStripeFallback />
        ) : (
          <VerificationField
            label="Payment method"
            description={
              billingReady ? undefined : 'Save contact information first to add a payment method'
            }
            isEmpty={!paymentComplete}
            isLoading={isPaymentMethodPending}
            disabled={!billingReady || isPaymentMethodPending}
            openE2e="org-billing-payment-open"
            onOpen={() => billingReady && !isPaymentMethodPending && setPaymentDialogOpen(true)}>
            {paymentComplete && paymentSummary ? (
              <div
                className="flex min-w-0 items-center gap-2.5"
                data-e2e="org-billing-payment-summary">
                <CardBrandIcon brand={paymentSummary.brand} />
                <p className="text-foreground truncate text-[13px] leading-[18px] font-medium">
                  {paymentSummary.label}
                </p>
              </div>
            ) : null}
          </VerificationField>
        )}

        <div className="flex flex-col gap-3">
          <Button
            htmlType="button"
            type="primary"
            className="w-full"
            disabled={!canSubmit || isCompleting}
            loading={isCompleting}
            onClick={handleSubmit}
            data-e2e="create-organization-submit">
            {isCompleting ? 'Starting...' : submitLabel}
          </Button>

          <p className="text-foreground text-xs opacity-80">
            <span className="font-semibold">Note:</span> Your card will be authorized, but not
            charged
          </p>
        </div>
      </div>

      <OrgContactInfoDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        defaultValues={contactDialogDefaults}
        isSaving={setupBillingMutation.isPending}
        onSave={handleContactSave}
      />

      {stripePublishableKey && billingReady && orgId && accountName && namespace && (
        <AddPaymentMethodDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          stripePublishableKey={stripePublishableKey}
          forceDefault
          billingDetailsPrefill={billingDetailsPrefill}
          onCreatePaymentMethod={createPaymentMethod}
          onConfirmed={handlePaymentConfirmed}
        />
      )}
    </>
  );
};

interface VerificationFieldProps {
  label: string;
  description?: string;
  isEmpty: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  openE2e?: string;
  onOpen: () => void;
  children?: React.ReactNode;
}

const VerificationField = ({
  label,
  description,
  isEmpty,
  isLoading = false,
  disabled = false,
  openE2e,
  onOpen,
  children,
}: VerificationFieldProps) => (
  <div className="flex flex-col gap-2">
    <p className="text-foreground text-xs font-semibold opacity-80">{label}</p>
    {isLoading ? (
      <div
        className="border-border bg-muted/50 flex h-auto min-h-9 w-full items-center gap-2.5 rounded-md border px-3 py-2"
        data-e2e="org-billing-payment-loading">
        <SpinnerIcon size="xs" aria-hidden="true" />
        <p className="text-muted-foreground text-[13px] leading-[18px]">Saving payment method…</p>
      </div>
    ) : isEmpty ? (
      <button
        type="button"
        disabled={disabled}
        data-e2e={openE2e}
        onClick={onOpen}
        className={cn(
          'border-border bg-muted/50 flex h-9 w-full items-center justify-center rounded-md border px-3 py-2 transition-colors',
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted'
        )}>
        <span
          className={cn('text-xs underline', disabled ? 'text-muted-foreground' : 'text-primary')}>
          Enter information
        </span>
      </button>
    ) : (
      <div className="bg-card-success flex w-full min-w-0 overflow-hidden rounded-md border border-[#86A182]">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">{children}</div>
          <button
            type="button"
            onClick={onOpen}
            className="text-foreground hover:text-foreground shrink-0 text-xs transition-colors">
            Edit
          </button>
        </div>
        <div
          className="flex w-4 shrink-0 items-center justify-center bg-[#86A182]"
          aria-hidden="true">
          <Icon icon={CheckIcon} className="size-2.5 text-white" strokeWidth={2.5} />
        </div>
      </div>
    )}
    {description && (
      <p className="text-foreground text-1xs font-normal opacity-60">{description}</p>
    )}
  </div>
);

const StripePaymentLoading = () => (
  <div className="border-border bg-muted/40 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
    <SpinnerIcon size="sm" aria-hidden="true" />
    <p className="text-foreground text-sm font-medium">Loading payment form…</p>
    <p className="text-muted-foreground max-w-md text-xs">This usually takes a moment.</p>
  </div>
);

const UnconfiguredStripeFallback = () => (
  <div className="flex flex-col gap-3">
    <div className="border-border bg-muted/40 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center">
      <Icon icon={ClockIcon} className="text-muted-foreground size-5" />
      <p className="text-foreground text-sm font-medium">Card payments aren&apos;t ready yet</p>
      <p className="text-muted-foreground max-w-md text-xs">
        We&apos;re still getting card payments set up for your account. Our team can help if you
        need to get a card on file straight away.
      </p>
    </div>
    <Button
      htmlType="button"
      type="primary"
      className="w-full"
      onClick={() =>
        openSupportMessage({
          subject: 'Adding a payment method',
          text: "I need to add a card to my account and the form isn't working",
        })
      }>
      Contact support
    </Button>
  </div>
);
