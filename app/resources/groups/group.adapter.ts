import type { Group, GroupList } from './group.schema';
import type { ComMiloapisIamV1Alpha1Group } from '@/modules/control-plane/iam';

/**
 * Transform raw API Group to domain Group type
 */
export function toGroup(raw: ComMiloapisIamV1Alpha1Group): Group {
  const { metadata } = raw;
  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ?? '',
  };
}

/**
 * Transform raw API list to domain GroupList
 */
export function toGroupList(items: ComMiloapisIamV1Alpha1Group[], nextCursor?: string): GroupList {
  return {
    items: items.map(toGroup),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}
