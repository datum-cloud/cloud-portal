import { CardBrandIcon } from '@/features/billing/components/card-brand-icon';
import { CARD_BRAND_LABELS } from '@/features/billing/constants';
import { AddPaymentMethodDialog } from '@/features/billing/dialogs/add-payment-method-dialog';
import { normalizeCardBrand, type CardBrand, type PaymentMethod } from '@/features/billing/types';
import { BillingVerificationBenefits } from '@/features/onboarding/components/billing-verification-benefits';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { OrgContactInfoDialog } from '@/features/onboarding/dialogs/org-contact-info-dialog';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import {
  buildOrgContactDefaults,
  formatOrgContactPrimaryLine,
  formatOrgContactSecondaryLine,
  isOrgContactInfoComplete,
  orgDisplayNameFromContact,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import type { AddPaymentMethodValues, StripePaymentMethodConfirmedDetails } from '@/modules/stripe';
import { useCreatePaymentMethod, type CreatePaymentMethodInput } from '@/resources/payment-methods';
import { usePaymentMethods, usePaymentMethodsWatch } from '@/resources/payment-methods';
import { waitForStripePaymentMethodSetup } from '@/resources/stripe-payment-methods';
import { paths } from '@/utils/config/paths.config';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ClockIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

interface PaymentMethodSummary {
  brand: CardBrand;
  last4: string;
  label: string;
}

const paymentMethodSummaryFromList = (
  methods: PaymentMethod[] | undefined
): PaymentMethodSummary | null => {
  if (!methods?.length) return null;

  const withCard = methods.find((method) => method.status?.details?.card?.last4);
  if (!withCard?.status?.details?.card) return null;

  const card = withCard.status.details.card;
  const brand = normalizeCardBrand(card.brand);
  const last4 = card.last4 ?? '••••';
  const brandLabel = CARD_BRAND_LABELS[brand];

  return {
    brand,
    last4,
    label: `${brandLabel} ✸✸✸✸ ${last4}`,
  };
};

export interface BillingFormProps {
  orgId: string;
  accountName: string;
  namespace: string;
  stripePublishableKey?: string;
  contactPrefill?: Partial<OrgContactInfoValues>;
}

export const BillingForm = ({
  orgId,
  accountName,
  namespace,
  stripePublishableKey,
  contactPrefill,
}: BillingFormProps) => {
  const navigate = useNavigate();
  const [contactInfo, setContactInfo] = useState<OrgContactInfoValues | null>(() => {
    const defaults = buildOrgContactDefaults(contactPrefill);
    return isOrgContactInfoComplete(defaults) ? defaults : null;
  });
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<PaymentMethodSummary | null>(null);

  const createPaymentMethodMutation = useCreatePaymentMethod();
  const { data: paymentMethods, refetch: refetchPaymentMethods } = usePaymentMethods(orgId);
  usePaymentMethodsWatch(orgId);

  const applyPaymentSummary = useCallback((brand: string | null | undefined, last4: string) => {
    const normalizedBrand = normalizeCardBrand(brand);
    setPaymentSummary({
      brand: normalizedBrand,
      last4,
      label: `${CARD_BRAND_LABELS[normalizedBrand]} ✸✸✸✸ ${last4}`,
    });
  }, []);

  useEffect(() => {
    const summary = paymentMethodSummaryFromList(paymentMethods);
    if (summary) {
      setPaymentSummary(summary);
    }
  }, [paymentMethods]);

  const handlePaymentConfirmed = useCallback(
    (details?: StripePaymentMethodConfirmedDetails) => {
      setPaymentDialogOpen(false);
      if (details?.last4) {
        applyPaymentSummary(details.brand, details.last4);
      }
      void refetchPaymentMethods();
    },
    [applyPaymentSummary, refetchPaymentMethods]
  );

  const createPaymentMethod = useCallback(
    async (values: AddPaymentMethodValues) => {
      const input: CreatePaymentMethodInput = {
        orgId,
        billingAccountName: accountName,
        displayName: values.displayName,
      };

      const { paymentMethodName } = await createPaymentMethodMutation.mutateAsync(input);

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

  const contactComplete = isOrgContactInfoComplete(contactInfo);
  const paymentComplete = paymentSummary !== null;
  const canStartFree = contactComplete && paymentComplete && stripePublishableKey;

  const contactDialogDefaults = useMemo(
    () => contactInfo ?? buildOrgContactDefaults(contactPrefill),
    [contactInfo, contactPrefill]
  );

  const billingDetailsPrefill = useMemo(() => {
    const source = contactInfo ?? contactDialogDefaults;
    if (!source.email?.trim()) return undefined;
    return {
      email: source.email.trim(),
      name: source.name?.trim() || source.businessName?.trim() || undefined,
    };
  }, [contactInfo, contactDialogDefaults]);

  const handleStartFree = () => {
    if (!contactInfo || !canStartFree) return;
    navigate(paths.onboarding.provisioning, {
      replace: false,
      state: { orgName: orgDisplayNameFromContact(contactInfo) },
    });
  };

  return (
    <div className="z-10 flex w-full min-w-0 flex-col items-stretch gap-5 md:flex-row md:items-stretch">
      <OnboardingEntrance className="w-full min-w-0 md:max-w-[410px]">
        <Card className={cn(onboardingCardClassName, 'flex flex-col md:self-stretch')}>
          <CardContent className="flex flex-col gap-8 p-0">
            <p className="text-muted-foreground text-1xs text-center tracking-[0.4px] uppercase">
              Step 2 / 2
            </p>

            <h2 className="text-center text-2xl font-semibold">Payment Information Verification</h2>

            <div className="flex flex-col gap-8">
              <VerificationField
                label="Contact information"
                isEmpty={!contactComplete}
                onOpen={() => setContactDialogOpen(true)}>
                {contactComplete && contactInfo ? (
                  <div className="flex min-w-0 flex-col gap-1 text-left">
                    <p className="text-foreground truncate text-[13px] leading-[18px]">
                      {formatOrgContactPrimaryLine(contactInfo)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs leading-4 opacity-60">
                      {formatOrgContactSecondaryLine(contactInfo)}
                    </p>
                  </div>
                ) : null}
              </VerificationField>

              {!stripePublishableKey ? (
                <UnconfiguredStripeFallback />
              ) : (
                <VerificationField
                  label="Payment method"
                  isEmpty={!paymentComplete}
                  onOpen={() => setPaymentDialogOpen(true)}>
                  {paymentComplete && paymentSummary ? (
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CardBrandIcon brand={paymentSummary.brand} />
                      <p className="text-foreground truncate text-[13px] leading-[18px]">
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
                  className={cn(
                    'w-full',
                    !canStartFree &&
                      'border border-[rgba(156,121,121,0.1)] bg-[#f2eaea] text-[rgba(156,121,121,0.4)] hover:bg-[#f2eaea]'
                  )}
                  disabled={!canStartFree}
                  onClick={handleStartFree}>
                  Start free
                </Button>

                <p className="text-foreground mt-4 text-xs opacity-80">
                  <span className="font-semibold">Note:</span> Your card will be authorized, but not
                  charged
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </OnboardingEntrance>

      <BillingVerificationBenefits />

      <OrgContactInfoDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        defaultValues={contactDialogDefaults}
        onSave={setContactInfo}
      />

      {stripePublishableKey && (
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
    </div>
  );
};

interface VerificationFieldProps {
  label: string;
  isEmpty: boolean;
  onOpen: () => void;
  children?: React.ReactNode;
}

const VerificationField = ({ label, isEmpty, onOpen, children }: VerificationFieldProps) => (
  <div className="flex flex-col gap-2">
    <p className="text-foreground text-xs font-semibold opacity-80">{label}</p>
    {isEmpty ? (
      <button
        type="button"
        onClick={onOpen}
        className="border-border bg-muted/50 hover:bg-muted flex h-9 w-full items-center justify-center rounded-md border px-3 py-2 transition-colors">
        <span className="text-primary text-xs underline">Enter information</span>
      </button>
    ) : (
      <div className="border-border bg-muted/50 flex h-auto min-h-9 w-full items-center gap-2.5 rounded-md border px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">{children}</div>
        <button type="button" onClick={onOpen} className="text-primary shrink-0 text-xs underline">
          Change
        </button>
      </div>
    )}
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
