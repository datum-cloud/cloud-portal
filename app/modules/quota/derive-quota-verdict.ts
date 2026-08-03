import type { QuotaVerdict } from './types';
import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { ResourceRegistration } from '@/resources/resource-registrations';

/**
 * Fail-open rule: `hasQuota` is `false` ONLY when a bucket exists AND
 * `status.available <= 0`. Missing bucket, LIST error/403, or `Feature`-type
 * registration → `isUnknown: true` → callers render children unmodified.
 */
export function deriveQuotaVerdict(input: {
  resourceType: string;
  buckets?: AllowanceBucket[];
  registrations?: ResourceRegistration[];
  isError: boolean;
}): Omit<QuotaVerdict, 'isLoading'> {
  const registration = input.registrations?.find((r) => r.resourceType === input.resourceType);
  const open = { hasQuota: true, isUnknown: true, denied: false, registration } as const;
  if (input.isError || !input.buckets) return open;
  if (registration?.type === 'Feature') return open;
  const bucket = input.buckets.find((b) => b.resourceType === input.resourceType);
  if (!bucket?.status) return open;
  const { limit, allocated, available } = bucket.status;
  const denied = available <= 0;
  const label = registration?.displayName ?? input.resourceType;
  return {
    hasQuota: !denied,
    isUnknown: false,
    denied,
    deniedReason: denied
      ? `You've reached your ${label} quota (${allocated}/${limit}). Request an increase from Settings → Quotas.`
      : undefined,
    limit,
    allocated,
    available,
    bucket,
    registration,
  };
}
