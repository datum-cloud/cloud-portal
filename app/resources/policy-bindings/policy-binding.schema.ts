import type { ComMiloapisIamV1Alpha1PolicyBinding } from '@/modules/control-plane/iam';
import { z } from 'zod';

// Subject kind values
export const POLICY_BINDING_SUBJECT_KIND_VALUES = ['User', 'Group'] as const;
export type PolicyBindingSubjectKindValue = (typeof POLICY_BINDING_SUBJECT_KIND_VALUES)[number];

// Subject schema
export const policyBindingSubjectResourceSchema = z.object({
  kind: z.enum(POLICY_BINDING_SUBJECT_KIND_VALUES),
  name: z.string(),
  uid: z.string().optional(),
  namespace: z.string().optional(),
});

export type PolicyBindingSubject = z.infer<typeof policyBindingSubjectResourceSchema>;

// Role reference schema
export const roleRefSchema = z.object({
  name: z.string(),
  namespace: z.string().optional(),
});

export type RoleRef = z.infer<typeof roleRefSchema>;

// Resource kind schema (for kind-based selection)
export const resourceKindSchema = z.object({
  apiGroup: z.string().optional(),
  kind: z.string(),
});

export type ResourceKind = z.infer<typeof resourceKindSchema>;

// Resource ref schema (for specific resource selection)
export const resourceRefSchema = z.object({
  apiGroup: z.string().optional(),
  kind: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  uid: z.string().optional(),
});

export type ResourceRef = z.infer<typeof resourceRefSchema>;

// Resource selector schema
export const resourceSelectorSchema = z.object({
  resourceKind: resourceKindSchema.optional(),
  resourceRef: resourceRefSchema.optional(),
});

export type ResourceSelector = z.infer<typeof resourceSelectorSchema>;

// Policy binding resource schema
export const policyBindingResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  createdAt: z.string(),
  subjects: z.array(policyBindingSubjectResourceSchema),
  roleRef: roleRefSchema.optional(),
  resourceSelector: resourceSelectorSchema.optional(),
  status: z.any().optional(),
});

export type PolicyBinding = z.infer<typeof policyBindingResourceSchema>;

// Policy binding list schema
export const policyBindingListSchema = z.object({
  items: z.array(policyBindingResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type PolicyBindingList = z.infer<typeof policyBindingListSchema>;

// Input types for service operations
export type CreatePolicyBindingInput = {
  resource: {
    ref: string;
    name: string;
    namespace?: string;
    uid?: string;
  };
  role: string;
  roleNamespace?: string;
  subjects: Array<{
    kind: PolicyBindingSubjectKindValue;
    name: string;
    uid?: string;
  }>;
};

export type UpdatePolicyBindingInput = CreatePolicyBindingInput;

// Legacy enum
export enum PolicyBindingSubjectKind {
  User = 'User',
  Group = 'Group',
}

// Form validation schemas
export const policyBindingSubjectSchema = z.object({
  kind: z.enum(Object.values(PolicyBindingSubjectKind) as [string, ...string[]], {
    error: 'Kind is required.',
  }),
  name: z.string({ error: 'Subject is required.' }),
  uid: z.string().optional(),
});

export const policyBindingResourceValidationSchema = z.object({
  ref: z.string({ error: 'Resource name is required.' }),
  name: z.string({ error: 'Resource is required.' }),
  namespace: z.string().optional(),
  uid: z.string().optional(),
});

export const newPolicyBindingSchema = z.object({
  resource: policyBindingResourceValidationSchema,
  role: z.string({ error: 'Role is required.' }),
  roleNamespace: z.string().optional(),
  subjects: z
    .array(policyBindingSubjectSchema)
    .min(1, { message: 'At least one subject is required' }),
});

export type NewPolicyBindingSchema = z.infer<typeof newPolicyBindingSchema>;
export type PolicyBindingSubjectSchema = z.infer<typeof policyBindingSubjectSchema>;
export type PolicyBindingResourceSchema = z.infer<typeof policyBindingResourceValidationSchema>;

// Legacy interface
export interface IPolicyBindingControlResponse {
  name: string;
  createdAt: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
  subjects: NonNullable<ComMiloapisIamV1Alpha1PolicyBinding['spec']>['subjects'];
  roleRef?: NonNullable<ComMiloapisIamV1Alpha1PolicyBinding['spec']>['roleRef'];
  resourceSelector?: NonNullable<ComMiloapisIamV1Alpha1PolicyBinding['spec']>['resourceSelector'];
  status: ComMiloapisIamV1Alpha1PolicyBinding['status'];
}
