import { isUserOrgOwner, listOwnedOrgIds } from '@/resources/members/member-owner';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { redirect } from 'react-router';

/**
 * Org-scoped billing routes (`/org/:orgId/billing/*`) are for the org's
 * owners only. Everyone else lands back on the org overview. Closed when
 * the ownership lookup fails.
 */
export async function requireBillingOwner(orgId: string | undefined): Promise<void> {
  if (!orgId) {
    throw redirect(paths.account.root);
  }

  const isOwner = await isUserOrgOwner(orgId).catch(() => false);
  if (!isOwner) {
    throw redirect(getPathWithParams(paths.org.detail.root, { orgId }));
  }
}

/**
 * User-level billing routes (`/account/billing/*`) are cross-org: they
 * cover the orgs the user owns, out of `orgIds` (the orgs they belong to).
 * A user who owns none of them is sent back to their account.
 */
export async function requireOwnedBillingOrgs(orgIds: string[]): Promise<string[]> {
  const owned = new Set(await listOwnedOrgIds().catch(() => []));
  const ownedOrgIds = orgIds.filter((orgId) => owned.has(orgId));

  if (ownedOrgIds.length === 0) {
    throw redirect(paths.account.root);
  }

  return ownedOrgIds;
}
