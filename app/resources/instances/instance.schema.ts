import { z } from 'zod';

export type InstanceStatusValue = 'Available' | 'Pending' | 'Failed' | 'Unknown';

const instanceConditionSchema = z.object({
  type: z.string(),
  status: z.enum(['True', 'False', 'Unknown']),
  reason: z.string().optional(),
  message: z.string().optional(),
  lastTransitionTime: z.string().optional(),
});

export type InstanceCondition = z.infer<typeof instanceConditionSchema>;

export const instanceResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  createdAt: z.coerce.date(),
  workloadName: z.string().optional(),
  workloadUid: z.string().optional(),
  city: z.string().optional(),
  placement: z.string().optional(),
  instanceType: z.string().optional(),
  image: z.string().optional(),
  ports: z.array(z.string()).default([]),
  status: z.enum(['Available', 'Pending', 'Failed', 'Unknown']),
  externalIP: z.string().optional(),
  internalIP: z.string().optional(),
  conditions: z.array(instanceConditionSchema).default([]),
});

export type Instance = z.infer<typeof instanceResourceSchema>;

export const instanceListSchema = z.object({
  items: z.array(instanceResourceSchema),
});

export type InstanceList = z.infer<typeof instanceListSchema>;

/**
 * Maps an instance status value to the status key understood by `BadgeStatus`.
 */
export function instanceStatusToBadgeStatus(status: InstanceStatusValue): string {
  switch (status) {
    case 'Available':
      return 'active';
    case 'Pending':
      return 'pending';
    case 'Failed':
      return 'error';
    default:
      return 'inactive';
  }
}
