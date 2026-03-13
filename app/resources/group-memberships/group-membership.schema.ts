import { z } from 'zod';

export const groupMembershipSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  createdAt: z.string(),
  groupRef: z.object({
    name: z.string(),
    namespace: z.string(),
  }),
  userRef: z.object({
    name: z.string(),
  }),
});

export type GroupMembership = z.infer<typeof groupMembershipSchema>;

export const groupMembershipListSchema = z.object({
  items: z.array(groupMembershipSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type GroupMembershipList = z.infer<typeof groupMembershipListSchema>;
