import { z } from 'zod';

// Group resource schema
export const groupResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  createdAt: z.string(),
});

export type Group = z.infer<typeof groupResourceSchema>;

// Group list schema
export const groupListSchema = z.object({
  items: z.array(groupResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type GroupList = z.infer<typeof groupListSchema>;

// Create group input schema
export const createGroupSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(63, 'Name must be at most 63 characters')
    .regex(
      /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'Name must be lowercase, start with letter, use only letters, numbers, hyphens'
    ),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

// Update group input schema
export const updateGroupSchema = z.object({
  resourceVersion: z.string(),
});

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

// Legacy interface
export interface IGroupControlResponse {
  name: string;
  createdAt: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
}
