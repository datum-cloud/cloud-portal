import type { GroupMembership, GroupMembershipList } from './group-membership.schema';
import type { ComMiloapisIamV1Alpha1GroupMembership } from '@/modules/control-plane/iam';

/**
 * Transform raw API GroupMembership to domain GroupMembership type
 */
export function toGroupMembership(raw: ComMiloapisIamV1Alpha1GroupMembership): GroupMembership {
  const { metadata, spec } = raw;
  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ?? '',
    groupRef: {
      name: spec?.groupRef.name ?? '',
      namespace: spec?.groupRef.namespace ?? '',
    },
    userRef: {
      name: spec?.userRef.name ?? '',
    },
  };
}

/**
 * Transform raw API list to domain GroupMembershipList
 */
export function toGroupMembershipList(
  items: ComMiloapisIamV1Alpha1GroupMembership[],
  nextCursor?: string
): GroupMembershipList {
  return {
    items: items.map(toGroupMembership),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}
