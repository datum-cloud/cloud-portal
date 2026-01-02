import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';
import { z } from 'zod';

// Role schema
export const memberRoleSchema = z.object({
  name: z.string(),
  namespace: z.string().optional(),
});

export type MemberRole = z.infer<typeof memberRoleSchema>;

// User reference schema
export const memberUserSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export type MemberUser = z.infer<typeof memberUserSchema>;

// Organization reference schema
export const memberOrganizationSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  type: z.string().optional(),
});

export type MemberOrganization = z.infer<typeof memberOrganizationSchema>;

// Member resource schema
export const memberResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  user: memberUserSchema,
  organization: memberOrganizationSchema,
  roles: z.array(memberRoleSchema),
  status: z.any().optional(),
});

export type Member = z.infer<typeof memberResourceSchema>;

// Member list schema
export const memberListSchema = z.object({
  items: z.array(memberResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type MemberList = z.infer<typeof memberListSchema>;

// Update role input type
export type UpdateMemberRoleInput = {
  role: string;
  roleNamespace?: string;
};

// Form validation schemas
export const memberUpdateRoleSchema = z.object({
  role: z.string({ error: 'Role is required.' }),
  roleNamespace: z.string().optional(),
});

export type MemberUpdateRoleSchema = z.infer<typeof memberUpdateRoleSchema>;

// Legacy interface for backward compatibility
export interface IMemberControlResponse {
  name: string;
  createdAt: Date;
  uid: string;
  resourceVersion: string;
  user: {
    id: string;
    email?: string;
    familyName?: string;
    givenName?: string;
    avatarUrl?: string;
  };
  organization: {
    id: string;
    displayName?: string;
    type?: string;
  };
  roles: {
    name: string;
    namespace?: string;
  }[];
  status?: ComMiloapisResourcemanagerV1Alpha1OrganizationMembership['status'];
}
