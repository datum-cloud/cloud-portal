// app/resources/secrets/secret.watch.ts
import { toSecret } from './secret.adapter';
import type { Secret } from './secret.schema';
import { SECRET_SYNC_KIND, secretKeys } from './secret.service';
import type { IoK8sApiCoreV1Secret } from '@/modules/control-plane/k8s-core';
import { useResourceWatch } from '@/modules/watch';
import type { CacheItemMeta } from '@/modules/watch/resource-cache';

export const secretListCache = {
  getItemKey: (secret: Secret) => secret.name,
  getMeta: (secret: Secret): CacheItemMeta => ({
    name: secret.name,
    resourceVersion: secret.resourceVersion,
    deletionTimestamp: secret.deletionTimestamp,
  }),
};

/**
 * Watch secrets list for real-time updates.
 */
export function useSecretsWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Secret>({
    resourceType: 'api/v1/secrets',
    projectId,
    namespace: 'default',
    queryKey: secretKeys.list(projectId),
    transform: (item) => toSecret(item as IoK8sApiCoreV1Secret),
    enabled: options?.enabled ?? true,
    syncKind: SECRET_SYNC_KIND,
    syncScope: projectId,
    ...secretListCache,
  });
}

/**
 * Watch a single secret for real-time updates.
 */
export function useSecretWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<Secret>({
    resourceType: 'api/v1/secrets',
    projectId,
    namespace: 'default',
    name,
    queryKey: secretKeys.detail(projectId, name),
    transform: (item) => toSecret(item as IoK8sApiCoreV1Secret),
    enabled: options?.enabled ?? true,
  });
}
