import { isFeatureEnabled } from './evaluate.server';
import { FeatureFlag } from './flags';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { redirect } from 'react-router';

/**
 * Org-scoped billing routes (`/org/:orgId/billing/*`) require the Billing
 * flag for that org. Closed-by-default on eval failure.
 */
export async function requireBillingForOrg(orgId: string | undefined): Promise<void> {
  if (!orgId) {
    throw redirect(paths.account.root);
  }

  const enabled = await isFeatureEnabled(FeatureFlag.Billing, orgId).catch(() => false);
  if (!enabled) {
    throw redirect(getPathWithParams(paths.org.detail.root, { orgId }));
  }
}

/**
 * User-level billing routes (`/account/billing/*`) are cross-org — enabled
 * when the Billing flag is on for any org the user belongs to.
 */
export async function requireBillingForAnyOrg(orgIds: string[]): Promise<void> {
  if (orgIds.length === 0) {
    throw redirect(paths.account.root);
  }

  const results = await Promise.all(
    orgIds.map((orgId) => isFeatureEnabled(FeatureFlag.Billing, orgId).catch(() => false))
  );

  if (!results.some(Boolean)) {
    throw redirect(paths.account.root);
  }
}
