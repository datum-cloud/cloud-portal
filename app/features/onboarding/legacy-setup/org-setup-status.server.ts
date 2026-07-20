import { evaluateOrgSetupComplete } from './org-setup-status';
import { logger } from '@/modules/logger';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createOrganizationService } from '@/resources/organizations';
import { createPaymentMethodService } from '@/resources/payment-methods';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';

async function loadOrgSetupInputs(orgId: string) {
  const org = await createOrganizationService().get(orgId);

  let billingAccounts: Awaited<ReturnType<ReturnType<typeof createBillingAccountService>['list']>> =
    [];
  let paymentMethods: Awaited<ReturnType<ReturnType<typeof createPaymentMethodService>['list']>> =
    [];

  try {
    billingAccounts = await createBillingAccountService().list(orgId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof AuthenticationError) {
      logger.warn(`Could not list billing accounts for ${orgId} during setup check`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    throw error;
  }

  try {
    paymentMethods = await createPaymentMethodService().list(orgId);
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof AuthenticationError) {
      logger.warn(`Could not list payment methods for ${orgId} during setup check`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    throw error;
  }

  return { org, billingAccounts, paymentMethods };
}

/** Returns true when the org has contact info, a billing account, and an active payment method. */
export async function isOrgSetupComplete(orgId: string): Promise<boolean> {
  const inputs = await loadOrgSetupInputs(orgId);
  if (!inputs) {
    return true;
  }

  return evaluateOrgSetupComplete(inputs);
}

/** First org id (in list order) that still needs billing setup, or null when all are complete. */
export async function findFirstIncompleteOrg(orgIds: readonly string[]): Promise<string | null> {
  for (const orgId of orgIds) {
    const complete = await isOrgSetupComplete(orgId);
    if (!complete) {
      return orgId;
    }
  }
  return null;
}
