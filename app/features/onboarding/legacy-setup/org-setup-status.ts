import type { BillingAccount, PaymentMethod } from '@/features/billing/types';
import {
  getDefaultOrgBillingAccountName,
  selectDefaultOrgBillingAccount,
} from '@/features/billing/types';
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

/** Pure evaluation of org billing setup completeness. */
export function evaluateOrgSetupComplete(input: OrgSetupEvaluationInput): boolean {
  if (!isOrgContactSetupComplete(input.org)) {
    return false;
  }

  const billingAccountName = getDefaultOrgBillingAccountName(input.billingAccounts);
  if (!billingAccountName) {
    return false;
  }

  return hasActivePaymentMethodForAccount(input.paymentMethods, billingAccountName);
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
