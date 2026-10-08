import type { BillingAccount, PaymentMethod } from '@/features/billing/types';
import { selectDefaultOrgBillingAccount } from '@/features/billing/types';
import {
  buildOrgContactDefaults,
  isOrgContactInfoComplete,
  orgContactInfoToFormValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import type { Organization } from '@/resources/organizations';

export interface OrgSetupEvaluationInput {
  org: Pick<Organization, 'contactInfo'>;
  billingAccounts: BillingAccount[];
  paymentMethods: PaymentMethod[];
}

/** Whether the org has a saved contact email and name. */
export function isOrgContactSetupComplete(org: Pick<Organization, 'contactInfo'>): boolean {
  return isOrgContactInfoComplete(
    buildOrgContactDefaults(orgContactInfoToFormValues(org.contactInfo))
  );
}

/**
 * Billing's "can this account be billed?" condition. True when the default
 * payment method is active or when staff have granted payment terms.
 */
const PAYMENT_READY_CONDITION = 'PaymentReady';

/** PaymentReady reason when the account is billed by invoice, with no card needed. */
const INVOICE_TERMS_REASON = 'InvoiceTerms';

function findPaymentReadyCondition(account: BillingAccount | undefined) {
  return account?.status?.conditions?.find((c) => c.type === PAYMENT_READY_CONDITION);
}

/** Whether billing reports that the account can be billed (by card or by invoice terms). */
export function isBillingAccountPaymentReady(account: BillingAccount | undefined): boolean {
  return findPaymentReadyCondition(account)?.status === 'True';
}

/** Whether staff have granted the account invoice terms, so it doesn't need a card. */
export function hasActiveInvoiceTerms(account: BillingAccount | undefined): boolean {
  const condition = findPaymentReadyCondition(account);
  return condition?.status === 'True' && condition.reason === INVOICE_TERMS_REASON;
}

/** Whether an active payment method backs the given billing account. */
export function hasActivePaymentMethodForAccount(
  paymentMethods: PaymentMethod[],
  billingAccountName: string
): boolean {
  return paymentMethods.some(
    (method) =>
      method.spec?.billingAccountRef?.name === billingAccountName &&
      method.status?.phase === 'Active'
  );
}

/**
 * Pure evaluation of org billing setup completeness: contact info, plus a
 * default billing account that can be billed.
 *
 * Billing's PaymentReady condition decides "can be billed", covering both a
 * card and staff-granted invoice terms. An active payment method is still
 * accepted on its own, so accounts the billing controller hasn't reconciled
 * since PaymentReady was added (billing v0.3.10) aren't sent back to the card
 * step. Drop the fallback once every environment runs that version.
 */
export function evaluateOrgSetupComplete(input: OrgSetupEvaluationInput): boolean {
  if (!isOrgContactSetupComplete(input.org)) {
    return false;
  }

  const billingAccount = selectDefaultOrgBillingAccount(input.billingAccounts);
  const billingAccountName = billingAccount?.metadata?.name;
  if (!billingAccountName) {
    return false;
  }

  return (
    isBillingAccountPaymentReady(billingAccount) ||
    hasActivePaymentMethodForAccount(input.paymentMethods, billingAccountName)
  );
}

/**
 * Result of loading org setup inputs when billing/payment listing may have
 * hit a transient auth error (401/403). Contact incompleteness is always
 * definitive; only fail-open when contact is already complete and billing
 * state can't be determined.
 */
export type OrgSetupLoadResult =
  | { status: 'ready'; input: OrgSetupEvaluationInput }
  | { status: 'billing-indeterminate'; org: Pick<Organization, 'contactInfo'> };

/**
 * Resolve completeness from a load result. Missing contact → incomplete even
 * when billing/payment lists 403; complete contact + indeterminate billing →
 * fail-open (treat as complete) so a broken billing API doesn't trap users.
 */
export function isOrgSetupCompleteFromLoadResult(result: OrgSetupLoadResult): boolean {
  if (result.status === 'billing-indeterminate') {
    return isOrgContactSetupComplete(result.org);
  }

  return evaluateOrgSetupComplete(result.input);
}

/** Resolve the default billing account used for setup checks. */
export function resolveDefaultBillingAccountName(accounts: BillingAccount[]): string | undefined {
  return selectDefaultOrgBillingAccount(accounts)?.metadata?.name;
}
