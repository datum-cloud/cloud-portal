import { z } from 'zod';

// Role enum values
export const ROLE_VALUES = ['owner', 'viewer'] as const;
export type RoleValue = (typeof ROLE_VALUES)[number];

// Role labels
export const RoleLabels: Record<RoleValue, string> = {
  owner: 'Owner',
  viewer: 'Viewer',
};

// Role resource schema
export const roleResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  createdAt: z.string(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  annotations: z.record(z.string(), z.string()).optional(),
});

export type Role = z.infer<typeof roleResourceSchema>;

// Role list schema
export const roleListSchema = z.object({
  items: z.array(roleResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type RoleList = z.infer<typeof roleListSchema>;

// Legacy enum for backward compatibility
export enum Roles {
  Owner = 'owner',
  Viewer = 'viewer',
}

// Legacy role labels
export const LegacyRoleLabels: Record<Roles, string> = {
  [Roles.Owner]: 'Owner',
  [Roles.Viewer]: 'Viewer',
};

// Legacy interface
export interface IRoleControlResponse {
  name: string;
  createdAt: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
  displayName?: string;
  description?: string;
  annotations?: Record<string, string>;
}
