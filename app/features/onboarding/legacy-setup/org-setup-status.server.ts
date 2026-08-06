import { isOrgSetupCompleteFromLoadResult, type OrgSetupLoadResult } from './org-setup-status';
import { logger } from '@/modules/logger';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createOrganizationService } from '@/resources/organizations';
import { createPaymentMethodService } from '@/resources/payment-methods';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';

/** Sentinel: a transient auth error while checking billing/payment inputs. */
const TRANSIENT_ERROR = Symbol('transient-error');

function handleTransientError(orgId: string, label: string) {
  return (error: unknown): typeof TRANSIENT_ERROR => {
    if (error instanceof AuthorizationError || error instanceof AuthenticationError) {
      logger.warn(`Could not list ${label} for ${orgId} during setup check`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return TRANSIENT_ERROR;
    }
    throw error;
  };
}

/**
 * Org, billing accounts, and payment methods fetched concurrently. Billing /
 * payment 401/403 become `billing-indeterminate` so the caller can still
 * evaluate contact incompleteness (definitive) without pretending the whole
 * org is set up.
 */
async function loadOrgSetupInputs(orgId: string): Promise<OrgSetupLoadResult> {
  const [org, billingAccounts, paymentMethods] = await Promise.all([
    createOrganizationService().get(orgId),
    createBillingAccountService()
      .list(orgId)
      .catch(handleTransientError(orgId, 'billing accounts')),
    createPaymentMethodService().list(orgId).catch(handleTransientError(orgId, 'payment methods')),
  ]);

  if (billingAccounts === TRANSIENT_ERROR || paymentMethods === TRANSIENT_ERROR) {
    return { status: 'billing-indeterminate', org };
  }

  return { status: 'ready', input: { org, billingAccounts, paymentMethods } };
}

/** Returns true when the org has contact info, a billing account, and an active payment method. */
export async function isOrgSetupComplete(orgId: string): Promise<boolean> {
  return isOrgSetupCompleteFromLoadResult(await loadOrgSetupInputs(orgId));
}
