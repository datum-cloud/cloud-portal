import {
  allowanceBucketStatusSchema,
  type AllowanceBucket,
  type AllowanceBucketList,
  type AllowanceBucketStatus,
} from './allowance-bucket.schema';
import type { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@/modules/control-plane/quota';
import { logger } from '@/modules/logger';

function toAllowanceBucketStatus(
  status: ComMiloapisQuotaV1Alpha1AllowanceBucket['status']
): AllowanceBucketStatus | undefined {
  if (!status) return undefined;
  const parsed = allowanceBucketStatusSchema.safeParse(status);
  if (!parsed.success) {
    // Degrading to undefined is fail-open (verdicts read "unknown") — log so a
    // backend status-shape drift is diagnosable instead of silently blanking rows.
    logger.warn('[AllowanceBucket] dropping malformed status', { issues: parsed.error.message });
    return undefined;
  }
  return parsed.data;
}

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
    status: toAllowanceBucketStatus(status),
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
