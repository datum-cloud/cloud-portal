import type { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@/modules/control-plane/quota';
import { z } from 'zod';

/**
 * Numeric wire values may arrive as number | bigint | numeric string. `null` and
 * `''` must NOT coerce to 0 — a degenerate status parses as absent → fail-open
 * (unknown verdict), never as a definitive "exhausted" one.
 */
const quotaNumber = z.preprocess(
  (v) => (v === null || v === '' ? undefined : v),
  z.coerce.number()
);

// Allowance bucket status schema
export const allowanceBucketStatusSchema = z.object({
  limit: quotaNumber,
  allocated: quotaNumber,
  available: quotaNumber, // pre-clamped >= 0 by the controller
  claimCount: quotaNumber.optional(),
  grantCount: quotaNumber.optional(),
  lastReconciliation: z.string().optional(),
  observedGeneration: quotaNumber.optional(),
});

export type AllowanceBucketStatus = z.infer<typeof allowanceBucketStatusSchema>;

// Allowance bucket resource schema
export const allowanceBucketResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  createdAt: z.string().optional(),
  resourceType: z.string(),
  status: allowanceBucketStatusSchema.optional(),
});

export type AllowanceBucket = z.infer<typeof allowanceBucketResourceSchema>;

// Allowance bucket list schema
export const allowanceBucketListSchema = z.object({
  items: z.array(allowanceBucketResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type AllowanceBucketList = z.infer<typeof allowanceBucketListSchema>;

// Legacy interface
export interface IAllowanceBucketControlResponse {
  name: string;
  createdAt?: Date;
  uid: string;
  namespace: string;
  resourceType: string;
  status: ComMiloapisQuotaV1Alpha1AllowanceBucket['status'];
}
