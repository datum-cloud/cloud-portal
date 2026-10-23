import {
  ESTIMATED_SPEND_OPTIONS,
  ORGANIZATION_TYPE_LABELS,
  type ApplicantOrganizationType,
  type EstimatedMonthlySpend,
} from '@/features/billing/payment-terms';
import type { CreateBillingArrangementApplicationInput } from '@/resources/billing-arrangement-applications';
import { z } from 'zod';

const ORGANIZATION_TYPES = Object.keys(ORGANIZATION_TYPE_LABELS) as [
  ApplicantOrganizationType,
  ...ApplicantOrganizationType[],
];
const SPEND_BANDS = ESTIMATED_SPEND_OPTIONS as [EstimatedMonthlySpend, ...EstimatedMonthlySpend[]];

/**
 * Add `https://` when the customer typed a bare domain ("acme.com"). Billing
 * only accepts http(s) URLs.
 */
export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isWebsite(value: string): boolean {
  try {
    const url = new URL(normalizeWebsite(value));
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

const AUTHORIZED_MESSAGE = "Confirm you're authorized to apply for your organization";

/** Fields every application has, whichever way the customer wants to pay. */
const applicationFields = {
  legalName: z
    .string({ error: "Enter your organization's legal name" })
    .trim()
    .min(1, "Enter your organization's legal name")
    .max(256, 'Legal name is too long (256 characters max)'),
  organizationType: z.enum(ORGANIZATION_TYPES, { error: 'Choose an organization type' }),
  website: z
    .string({ error: 'Enter your company website' })
    .trim()
    .min(1, 'Enter your company website')
    .max(2048, 'Website is too long')
    .refine(isWebsite, 'Enter a website address, like https://acme.com'),
  situation: z
    .string({ error: 'Tell us about your situation' })
    .trim()
    .min(1, 'Tell us about your situation')
    .max(2000, 'Keep it to 2,000 characters'),
  // An unticked checkbox submits nothing, so this is optional here and
  // required by the refinement below.
  authorized: z.boolean().optional(),
};

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).optional();

/**
 * The "Apply for payment terms" form. Field limits match billing's
 * BillingArrangementApplication schema, so the customer hears about a
 * problem here rather than from the API.
 *
 * One object (the form library reads its shape to decide which fields show
 * errors after a submit), with the invoice details checked in a refinement.
 * `when` makes that refinement run even while other fields are invalid, so
 * every missing field is reported at once.
 */
export const paymentTermsApplicationSchema = z
  .object({
    ...applicationFields,
    paymentOption: z.enum(['Invoice', 'NotSure'], { error: 'Choose how you would like to pay' }),
    estimatedMonthlySpend: z.enum(SPEND_BANDS).optional(),
    accountsPayableEmail: optionalText(254, 'Email is too long'),
    purchaseOrderNumber: optionalText(64, 'Purchase order number is too long (64 characters max)'),
    agreementReference: optionalText(128, 'Agreement reference is too long (128 characters max)'),
  })
  .superRefine(
    (values, ctx) => {
      // Checked here rather than on the field: the form library rebuilds
      // field schemas to coerce form values, which loses a field-level
      // refinement on an optional boolean.
      if (values?.authorized !== true) {
        ctx.addIssue({ code: 'custom', path: ['authorized'], message: AUTHORIZED_MESSAGE });
      }
      if (values?.paymentOption !== 'Invoice') return;
      if (!values.estimatedMonthlySpend) {
        ctx.addIssue({
          code: 'custom',
          path: ['estimatedMonthlySpend'],
          message: 'Choose your estimated monthly spend',
        });
      }
      if (!z.email().safeParse(values.accountsPayableEmail ?? '').success) {
        ctx.addIssue({
          code: 'custom',
          path: ['accountsPayableEmail'],
          message: 'Enter the email address invoices should go to',
        });
      }
    },
    { when: () => true }
  );

export type PaymentTermsApplicationValues = z.infer<typeof paymentTermsApplicationSchema>;

/** Turn the form's values into the application billing expects. */
export function toApplicationInput(
  values: PaymentTermsApplicationValues,
  target: { orgId: string; billingAccountName: string }
): CreateBillingArrangementApplicationInput {
  const optional = (value: string | undefined) => value?.trim() || undefined;
  return {
    orgId: target.orgId,
    billingAccountName: target.billingAccountName,
    paymentOption: values.paymentOption,
    organization: {
      legalName: values.legalName.trim(),
      type: values.organizationType,
      website: normalizeWebsite(values.website),
    },
    situation: values.situation.trim(),
    invoice:
      values.paymentOption === 'Invoice'
        ? {
            estimatedMonthlySpend: values.estimatedMonthlySpend ?? 'NotSure',
            accountsPayableEmail: values.accountsPayableEmail?.trim() ?? '',
            purchaseOrderNumber: optional(values.purchaseOrderNumber),
            agreementReference: optional(values.agreementReference),
          }
        : undefined,
    authorized: values.authorized === true,
  };
}
