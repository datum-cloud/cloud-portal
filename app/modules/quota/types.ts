import type { AllowanceBucket } from '@/resources/allowance-buckets';
import type { ResourceRegistration } from '@/resources/resource-registrations';

/** Module-facing scope vocabulary (matches RBAC props). Mapped to the service layer's 'organization' | 'project' at the hook boundary only. */
export type QuotaScope = 'org' | 'project';

export interface QuotaVerdict {
  hasQuota: boolean;
  isLoading: boolean;
  isUnknown: boolean;
  /** Definitive exhausted verdict — never true while loading or unknown. The single source for gate predicates. */
  denied: boolean;
  /** Auto-derived denial copy, set only when `denied`. The single source for tooltip text. */
  deniedReason?: string;
  limit?: number;
  allocated?: number;
  available?: number;
  bucket?: AllowanceBucket;
  registration?: ResourceRegistration;
}
