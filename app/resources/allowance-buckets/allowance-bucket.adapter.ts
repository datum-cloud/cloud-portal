import type { AllowanceBucket, AllowanceBucketList } from './allowance-bucket.schema';
import type { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@/modules/control-plane/quota';

/**
 * Transform raw API AllowanceBucket to domain AllowanceBucket type
 */
export function toAllowanceBucket(raw: ComMiloapisQuotaV1Alpha1AllowanceBucket): AllowanceBucket {
  const { metadata, spec, status } = raw;
  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    namespace: metadata?.namespace ?? '',
    createdAt: metadata?.creationTimestamp
      ? new Date(metadata.creationTimestamp).toISOString()
      : undefined,
    resourceType: spec.resourceType,
    status,
  };
}

/**
 * Transform raw API list to domain AllowanceBucketList
 */
export function toAllowanceBucketList(
  items: ComMiloapisQuotaV1Alpha1AllowanceBucket[],
  nextCursor?: string
): AllowanceBucketList {
  return {
    items: items.map(toAllowanceBucket),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}
