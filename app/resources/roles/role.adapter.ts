import type { Role, RoleList } from './role.schema';
import type { ComMiloapisIamV1Alpha1Role } from '@/modules/control-plane/iam';

/**
 * Transform raw API Role to domain Role type
 */
export function toRole(raw: ComMiloapisIamV1Alpha1Role): Role {
  const { metadata, spec } = raw;
  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp ?? '',
    displayName: metadata?.annotations?.['kubernetes.io/display-name'],
    description: metadata?.annotations?.['kubernetes.io/description'],
    annotations: metadata?.annotations,
    includedPermissions: spec?.includedPermissions,
    inheritedRoles: spec?.inheritedRoles?.map((r) => r.name),
    launchStage: spec?.launchStage,
  };
}

/**
 * Transform raw API list to domain RoleList
 */
export function toRoleList(items: ComMiloapisIamV1Alpha1Role[], nextCursor?: string): RoleList {
  return {
    items: items.map(toRole),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}
