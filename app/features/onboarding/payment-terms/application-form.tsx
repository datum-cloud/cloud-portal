import {
  paymentTermsApplicationSchema,
  toApplicationInput,
  type PaymentTermsApplicationValues,
} from './application-schema';
import { ProfileIdentity } from '@/components/profile-identity';
import {
  ESTIMATED_SPEND_OPTIONS,
  ORGANIZATION_TYPE_LABELS,
  estimatedSpendLabel,
  type ApplicantOrganizationType,
  type ApplicationPaymentOption,
} from '@/features/billing/payment-terms';
import {
  cardSetupPath,
  paymentTermsPath,
  type PaymentTermsEntry,
} from '@/features/billing/payment-terms-paths';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import { useCreateBillingArrangementApplication } from '@/resources/billing-arrangement-applications';
import { parseK8sMessage } from '@/utils/errors';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { RadioGroup, RadioGroupItem } from '@datum-cloud/datum-ui/radio-group';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { CircleHelpIcon, ReceiptTextIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

const PAYMENT_OPTIONS: Array<{
  value: ApplicationPaymentOption;
  label: string;
  description: string;
  icon: typeof ReceiptTextIcon;
}> = [
  {
    value: 'Invoice',
    label: 'Pay by invoice',
    description: 'Receive an invoice each billing cycle and pay by bank transfer, ACH or wire.',
    icon: ReceiptTextIcon,
  },
  {
    value: 'NotSure',
    label: 'Not sure',
    description: "Tell us about your situation and we'll suggest the best option.",
    icon: CircleHelpIcon,
  },
];

const sectionTitleClassName = 'text-foreground text-sm font-semibold';

function PaymentOptionCards({
  value,
  onChange,
}: {
  value: ApplicationPaymentOption | undefined;
  onChange: (value: ApplicationPaymentOption) => void;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as ApplicationPaymentOption)}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PAYMENT_OPTIONS.map((option) => (
        <label
          key={option.value}
          htmlFor={`payment-option-${option.value}`}
          data-e2e={`payment-terms-option-${option.value}`}
          className="has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/3 hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors">
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <Icon icon={option.icon} size={16} className="text-primary mb-1" />
            <Text as="span" size="sm" weight="medium">
              {option.label}
            </Text>
            <Text as="span" size="xs" textColor="muted">
              {option.description}
            </Text>
          </span>
          <RadioGroupItem
            id={`payment-option-${option.value}`}
            value={option.value}
            className="mt-0.5 shrink-0"
          />
        </label>
      ))}
    </RadioGroup>
  );
}

export interface PaymentTermsApplicationFormProps {
  orgId: string;
  billingAccountName: string;
  orgDisplayName: string;
  entry: PaymentTermsEntry;
  /** The billing account's currency, for the spend bands. */
  currency: string;
  /** Business name from the contact details, as a starting point for the legal name. */
  defaultLegalName?: string;
}

/**
 * "Apply for payment terms": one page, with the invoice details shown when
 * the customer picks "Pay by invoice". Submitting creates a
 * BillingArrangementApplication for staff to review.
 */
export function PaymentTermsApplicationForm({
  orgId,
  billingAccountName,
  orgDisplayName,
  entry,
  currency,
  defaultLegalName,
}: PaymentTermsApplicationFormProps) {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createApplication = useCreateBillingArrangementApplication();

  const handleSubmit = async (values: PaymentTermsApplicationValues) => {
    setSubmitError(null);
    try {
      await createApplication.mutateAsync(
        toApplicationInput(values, { orgId, billingAccountName })
      );
      // The loader now finds the pending application and shows its status.
      navigate(paymentTermsPath({ orgId, billingAccountName, entry }), { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message
          ? parseK8sMessage(error.message)
          : "We couldn't submit your application. Please try again."
      );
    }
  };

  return (
    <OnboardingEntrance className="mx-auto flex w-full max-w-[640px] min-w-0">
      <Card className={onboardingCardClassName}>
        <CardContent className="flex flex-col gap-8 p-0">
          <div className="flex flex-col items-center gap-3 text-center">
            <Text as="p" size="2xs" textColor="muted" className="tracking-[0.4px] uppercase">
              Payment terms
            </Text>
            <Title as="h2" level={3} weight="semibold">
              Apply for payment terms
            </Title>
            <div className="border-border bg-muted/50 flex max-w-full items-center gap-2 rounded-full border py-1 pr-3 pl-1">
              <ProfileIdentity
                avatarOnly
                name={orgDisplayName}
                size="xs"
                className="size-6 rounded-full"
                fallbackClassName="rounded-full text-4xs"
              />
              <Text weight="medium" textColor="default" ellipsis>
                {orgDisplayName}
              </Text>
            </div>
            <Text as="p" textColor="muted" className="max-w-[480px]">
              Tell us how your organization would like to pay. Our team reviews every application,
              usually within one business day, and we&apos;ll email you when there&apos;s a
              decision.
            </Text>
          </div>

          <Form.Root
            name="payment-terms-application"
            id="payment-terms-application-form"
            schema={paymentTermsApplicationSchema}
            mode="onBlur"
            defaultValues={{
              paymentOption: 'Invoice',
              legalName: defaultLegalName ?? '',
              authorized: false,
            }}
            isSubmitting={createApplication.isPending}
            onSubmit={handleSubmit}
            className="flex flex-col gap-8">
            <Form.Field name="paymentOption" label="How would you like to pay?" required>
              {({ control }) => (
                <PaymentOptionCards
                  value={control.value as ApplicationPaymentOption | undefined}
                  onChange={control.change}
                />
              )}
            </Form.Field>

            <section className="flex flex-col gap-5">
              <h3 className={sectionTitleClassName}>About your organization</h3>
              <Form.Field
                name="legalName"
                label="Legal name"
                description="Your organization's registered name, as it should appear on invoices."
                required>
                <Form.Input autoComplete="organization" data-e2e="payment-terms-legal-name" />
              </Form.Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Form.Field name="organizationType" label="Organization type" required>
                  <Form.Select placeholder="Choose a type">
                    {(Object.keys(ORGANIZATION_TYPE_LABELS) as ApplicantOrganizationType[]).map(
                      (type) => (
                        <Form.SelectItem key={type} value={type}>
                          {ORGANIZATION_TYPE_LABELS[type]}
                        </Form.SelectItem>
                      )
                    )}
                  </Form.Select>
                </Form.Field>
                <Form.Field
                  name="website"
                  label="Company website"
                  description="Helps us verify your organization."
                  required>
                  <Form.Input
                    placeholder="https://acme.com"
                    autoComplete="url"
                    data-e2e="payment-terms-website"
                  />
                </Form.Field>
              </div>
              <Form.Field
                name="situation"
                label="Tell us about your situation"
                description="Up to 2,000 characters."
                required>
                <Form.Textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="For example: our company pays software vendors by purchase order on net-30 terms."
                  data-e2e="payment-terms-situation"
                />
              </Form.Field>
            </section>

            <Form.When field="paymentOption" is="Invoice">
              <section className="flex flex-col gap-5">
                <h3 className={sectionTitleClassName}>Invoice details</h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Form.Field
                    name="estimatedMonthlySpend"
                    label="Estimated monthly spend"
                    description="Helps us review your application."
                    required>
                    <Form.Select placeholder="Choose a range">
                      {ESTIMATED_SPEND_OPTIONS.map((spend) => (
                        <Form.SelectItem key={spend} value={spend}>
                          {estimatedSpendLabel(spend, currency)}
                        </Form.SelectItem>
                      ))}
                    </Form.Select>
                  </Form.Field>
                  <Form.Field
                    name="accountsPayableEmail"
                    label="Accounts payable email"
                    description="We'll send invoices here as well as to your billing contact."
                    required>
                    <Form.Input
                      type="email"
                      placeholder="ap@acme.com"
                      autoComplete="email"
                      data-e2e="payment-terms-ap-email"
                    />
                  </Form.Field>
                  <Form.Field
                    name="purchaseOrderNumber"
                    label="Purchase order number (optional)"
                    description="Printed on your invoices.">
                    <Form.Input data-e2e="payment-terms-po" />
                  </Form.Field>
                  <Form.Field
                    name="agreementReference"
                    label="Agreement reference (optional)"
                    description="If you've signed an MSA or order form with Datum.">
                    <Form.Input placeholder="e.g. MSA-2026-014" />
                  </Form.Field>
                </div>
              </section>
            </Form.When>

            <Form.Field name="authorized">
              <label className="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
                <Form.Checkbox className="mt-0.5" data-e2e="payment-terms-authorized" />
                <Text as="span" size="sm" textColor="default">
                  I&apos;m authorized to request payment terms on behalf of {orgDisplayName}.
                </Text>
              </label>
            </Form.Field>

            {submitError ? (
              <Text as="p" textColor="destructive" role="alert" data-e2e="payment-terms-error">
                {submitError}
              </Text>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <LinkButton
                as={Link}
                href={cardSetupPath({ orgId, entry, billingAccountName })}
                type="secondary"
                theme="outline">
                {entry === 'settings' ? 'Cancel' : 'Add a card instead'}
              </LinkButton>
              <Form.Submit loadingText="Submitting" data-e2e="payment-terms-submit">
                Submit application
              </Form.Submit>
            </div>
          </Form.Root>
        </CardContent>
      </Card>
    </OnboardingEntrance>
  );
}
