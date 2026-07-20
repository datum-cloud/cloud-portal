import type { Member } from './member.schema';
import { createMemberService } from './member.service';
import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';
import { createOrganizationService } from '@/resources/organizations';

/** Role names that grant organization ownership. Mirrors the team page check. */
export const ORG_OWNER_ROLE_NAMES = ['owner', 'datum-cloud-owner'];

/** A single owner's contact details, for surfacing who to reach about an org. */
export interface OrgOwnerContact {
  name: string;
  email: string;
  avatarUrl?: string;
}

function hasOwnerRole(roles: ReadonlyArray<{ name?: string }> | undefined): boolean {
  return Boolean(
    roles?.some((role) => ORG_OWNER_ROLE_NAMES.includes(role.name?.toLowerCase() ?? ''))
  );
}

/** True when the raw membership carries an owner role. */
export function membershipHasOwnerRole(
  membership: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership | undefined
): boolean {
  return hasOwnerRole(membership?.spec?.roles);
}

/** Pure filter: the owners among a list of members, mapped to contact details. */
export function selectOrgOwners(members: Member[]): OrgOwnerContact[] {
  return members
    .filter((member) => hasOwnerRole(member.roles))
    .map((member) => ({
      name:
        `${member.user.givenName ?? ''} ${member.user.familyName ?? ''}`.trim() ||
        (member.user.email ?? ''),
      email: member.user.email ?? '',
      avatarUrl: member.user.avatarUrl,
    }));
}

/** Whether the signed-in user owns the given organization. */
export async function isUserOrgOwner(orgId: string): Promise<boolean> {
  const membership = await createOrganizationService().fetchMembershipForOrganization(orgId);
  return membershipHasOwnerRole(membership);
}

/** The organization's owners, for telling a non-owner who to contact. */
export async function listOrgOwners(orgId: string): Promise<OrgOwnerContact[]> {
  const members = await createMemberService().list(orgId);
  return selectOrgOwners(members);
}
