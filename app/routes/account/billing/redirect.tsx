import { requireOwnedBillingOrgs } from '@/modules/billing/billing-access.server';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { listOrganizationsForRequest } from '@/resources/organizations/organization-request-cache.server';
import { orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { type LoaderFunctionArgs, redirect } from 'react-router';

/**
 * Billing used to live at `/account/billing` (every account across the
 * user's orgs) and `/account/billing/:billingAccountId`. Each org now has one
 * billing account, managed from the org's own billing page, so old links are
 * sent there: an account link to its org, the list to the user's
 * organizations.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { billingAccountId } = params;
  if (!billingAccountId) {
    throw redirect(paths.account.organizations.root);
  }

  const orgs = await listOrganizationsForRequest().catch(() => ({ items: [] }));
  const orgIds = await requireOwnedBillingOrgs(orgs.items.map((o) => o.name));
  const account = await createBillingAccountService()
    .findByName(billingAccountId, orgIds)
    .catch(() => null);
  const orgId = orgIdFromNamespace(account?.metadata?.namespace);
  // Name the account, so an org with more than one shows the one linked to.
  throw redirect(
    orgId
      ? `${getPathWithParams(paths.org.detail.billing.root, { orgId })}?account=${encodeURIComponent(billingAccountId)}`
      : paths.account.organizations.root
  );
};

export default function AccountBillingRedirect() {
  return null;
}
