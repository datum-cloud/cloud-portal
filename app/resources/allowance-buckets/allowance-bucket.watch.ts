import { toAllowanceBucket } from './allowance-bucket.adapter';
import type { AllowanceBucket } from './allowance-bucket.schema';
import { allowanceBucketKeys } from './allowance-bucket.service';
import type { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@/modules/control-plane/quota';
import { useResourceWatch } from '@/modules/watch';
import { buildOrganizationNamespace } from '@/utils/common';

/** Live bucket updates. throttleMs 5000 — continuous status reconciliation, not user CRUD. */
export function useAllowanceBucketsWatch(
  scope: 'organization' | 'project',
  id: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<AllowanceBucket>({
    resourceType: 'apis/quota.miloapis.com/v1alpha1/allowancebuckets',
    ...(scope === 'organization'
      ? { orgId: id, namespace: buildOrganizationNamespace(id) }
      : { projectId: id, namespace: 'milo-system' }),
    queryKey: allowanceBucketKeys.list(scope, id),
    transform: (item) => toAllowanceBucket(item as ComMiloapisQuotaV1Alpha1AllowanceBucket),
    enabled: options?.enabled ?? true,
    throttleMs: 5000,
    // Don't drop ADDED events during the ~2s initial-sync window after subscribe —
    // a grant landing right then should still reach the cache.
    skipInitialSync: false,
    getItemKey: (b) => b.name,
    updateListCache: (oldData, newItem) => {
      // useResourceWatch guards oldData for null before invoking updateListCache.
      const list = oldData as AllowanceBucket[];
      const idx = list.findIndex((b) => b.name === newItem.name);
      if (idx === -1) return [...list, newItem];
      return list.map((b) => (b.name === newItem.name ? newItem : b));
    },
  });
}
