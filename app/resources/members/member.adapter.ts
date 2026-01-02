import type { Member, MemberList, UpdateMemberRoleInput } from './member.schema';
import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';

/**
 * Transform raw API OrganizationMembership to domain Member type
 */
export function toMember(raw: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership): Member {
  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    user: {
      id: raw.spec?.userRef?.name ?? '',
      ...raw.status?.user,
    },
    organization: {
      id: raw.spec?.organizationRef?.name ?? '',
      ...raw.status?.organization,
    },
    roles: raw.spec?.roles ?? [],
    status: raw.status,
  };
}

/**
 * Transform raw API list to domain MemberList
 */
export function toMemberList(
  items: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership[],
  nextCursor?: string
): MemberList {
  return {
    items: items.map(toMember),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Transform UpdateMemberRoleInput to API patch payload
 */
export function toUpdateMemberRolePayload(
  memberId: string,
  input: UpdateMemberRoleInput
): {
  apiVersion: string;
  kind: string;
  metadata: { name: string };
  spec: { roles: { name: string; namespace: string }[] };
} {
  return {
    apiVersion: 'resourcemanager.miloapis.com/v1alpha1',
    kind: 'OrganizationMembership',
    metadata: {
      name: memberId,
    },
    spec: {
      roles: [
        {
          name: input.role,
          namespace: input.roleNamespace ?? 'milo-system',
        },
      ],
    },
  };
}
