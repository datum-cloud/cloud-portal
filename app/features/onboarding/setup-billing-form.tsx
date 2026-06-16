import type { BillingAccount } from '@/features/billing/types';
import {
  StripePaymentMethodForm,
  type AddPaymentMethodValues,
  type StripePaymentMethodSubmitHandle,
} from '@/modules/stripe';
import { useUpdateBillingAccount } from '@/resources/billing-accounts';
import { useCreatePaymentMethod, type CreatePaymentMethodInput } from '@/resources/payment-methods';
import { waitForStripePaymentMethodSetup } from '@/resources/stripe-payment-methods';
import { paths } from '@/utils/config/paths.config';
import { openSupportMessage } from '@/utils/open-support-message';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tabs, TabsList, TabsTrigger } from '@datum-cloud/datum-ui/tabs';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ClockIcon } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { z } from 'zod';

const createSetupBillingSchema = (accountType: AccountType) =>
  z
    .object({
      displayName: z
        .string({ error: 'Give this billing account a name' })
        .min(1, 'Give this billing account a name')
        .max(256, 'Name is too long (256 characters max)'),
      businessName: z
        .string()
        .max(256, 'Business name is too long (256 characters max)')
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (accountType === 'business' && !data.businessName?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['businessName'],
          message: 'Enter your company name',
        });
      }
    });

type SetupBillingFormValues = z.infer<ReturnType<typeof createSetupBillingSchema>>;
type AccountType = 'personal' | 'business';

export interface SetupBillingFormProps {
  orgId: string;
  accountName: string;
  namespace: string;
  account: BillingAccount;
  stripePublishableKey?: string;
  defaultDisplayName: string;
  defaultBusinessName: string;
}

export const SetupBillingForm = ({
  orgId,
  accountName,
  namespace,
  account,
  stripePublishableKey,
  defaultDisplayName,
  defaultBusinessName,
}: SetupBillingFormProps) => {
  const navigate = useNavigate();
  const stripeSubmitRef = useRef<StripePaymentMethodSubmitHandle>(null);
  const [accountType, setAccountType] = useState<AccountType>(
    defaultBusinessName.trim() ? 'business' : 'personal'
  );
  const [stripeReady, setStripeReady] = useState(false);
  const [stripeSubmitting, setStripeSubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const contactInfo = account.spec?.contactInfo;

  const setupBillingSchema = useMemo(() => createSetupBillingSchema(accountType), [accountType]);

  const updateMutation = useUpdateBillingAccount({
    onError: (error) => {
      toast.error('Could not update billing account', {
        description: error.message || 'Please try again.',
      });
    },
  });

  const createPaymentMethodMutation = useCreatePaymentMethod();

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

  const handleSubmit = async (values: SetupBillingFormValues) => {
    if (!stripePublishableKey) return;
    if (!stripeSubmitRef.current?.isReady()) {
      toast.error('Payment form', {
        description: 'Card details are still loading. Please wait a moment and try again.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateMutation.mutateAsync({
        orgId,
        name: accountName,
        displayName: values.displayName,
        contactInfo: {
          name: contactInfo?.name,
          businessName:
            accountType === 'business' ? values.businessName?.trim() || undefined : undefined,
          email: contactInfo?.email,
          invoiceEmails: contactInfo?.invoiceEmails,
          address: contactInfo?.address,
        },
      });

      const paymentSuccess = await stripeSubmitRef.current.submit({
        displayName: 'Primary card',
        setAsDefault: true,
      });

      if (!paymentSuccess) return;

      toast.success('Billing account ready', {
        description: 'Your account details and payment method have been saved.',
      });
      navigate(paths.account.organizations.root, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = submitting || stripeSubmitting || updateMutation.isPending;

  return (
    <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-[500px] sm:p-4 md:p-6 lg:p-8 xl:p-[44px]">
      <CardContent className="flex flex-col gap-8 p-0">
        <p className="text-muted-foreground text-center text-[10px] tracking-[0.4px] uppercase">
          Step 2 / 3
        </p>

        <div className="flex flex-col gap-8">
          <h2 className="text-center text-2xl font-semibold">Setup your billing account</h2>

          <Tabs
            value={accountType}
            onValueChange={(value) => setAccountType(value as AccountType)}
            className="w-full">
            <TabsList className="dark:bg-background grid h-9 w-full grid-cols-2 rounded-md p-0.5">
              <TabsTrigger
                value="personal"
                className="data-[state=active]:bg-card data-[state=active]:text-primary h-8 rounded-[4px] data-[state=active]:shadow-sm">
                Personal
              </TabsTrigger>
              <TabsTrigger
                value="business"
                className="data-[state=active]:bg-card data-[state=active]:text-primary h-8 rounded-[4px] data-[state=active]:shadow-sm">
                Business
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!stripePublishableKey ? (
            <UnconfiguredStripeFallback />
          ) : (
            <Form.Root
              name="setup-billing"
              id="setup-billing-form"
              schema={setupBillingSchema}
              mode="onBlur"
              defaultValues={{
                displayName: defaultDisplayName,
                businessName: defaultBusinessName,
              }}
              isSubmitting={isBusy}
              onSubmit={handleSubmit}
              className="flex flex-col">
              <div className="flex flex-col gap-6">
                {accountType === 'business' && (
                  <Form.Field name="businessName" label="Company name" required>
                    <Form.Input placeholder="e.g. ACME Corporation" autoComplete="organization" />
                  </Form.Field>
                )}

                <Form.Field name="displayName" label="Billing account name" required>
                  <Form.Input placeholder="e.g. Primary billing" autoComplete="off" />
                </Form.Field>

                <StripePaymentMethodForm
                  publishableKey={stripePublishableKey}
                  layout="embedded"
                  hideDisplayName
                  hideSubmit
                  forceDefault
                  submitRef={stripeSubmitRef}
                  onReadyChange={setStripeReady}
                  onSubmittingChange={setStripeSubmitting}
                  onCreatePaymentMethod={createPaymentMethod}
                />
              </div>

              <Form.Submit
                className="w-full"
                size="default"
                loadingText="Saving..."
                disabled={!stripeReady}>
                Complete account setup
              </Form.Submit>
            </Form.Root>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const UnconfiguredStripeFallback = () => (
  <div className="flex flex-col gap-6">
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
