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

/** Resolve the default billing account used for setup checks. */
export function resolveDefaultBillingAccountName(accounts: BillingAccount[]): string | undefined {
  return selectDefaultOrgBillingAccount(accounts)?.metadata?.name;
}
