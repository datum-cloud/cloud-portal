import type { ComMiloapisQuotaV1Alpha1AllowanceBucket } from '@/modules/control-plane/quota';
import { z } from 'zod';

// Allowance bucket resource schema
export const allowanceBucketResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  createdAt: z.string().optional(),
  resourceType: z.string(),
  status: z.any().optional(),
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
