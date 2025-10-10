import { PolicyBindingSubjectKind } from '@/resources/interfaces/policy-binding.interface';
import { Roles } from '@/resources/interfaces/role.interface';
import { z } from 'zod';

export const policyBindingSubjectSchema = z.object({
  kind: z.enum(Object.values(PolicyBindingSubjectKind) as [string, ...string[]], {
    error: 'Kind is required.',
  }),
  name: z.string({ error: 'User is required.' }),
  uid: z.string().optional(),
});

export const policyBindingResourceSchema = z.object({
  ref: z.string({ error: 'Resource name is required.' }),
  name: z.string({ error: 'Resource is required.' }),
  namespace: z.string().optional(),
  uid: z.string().optional(),
});

export const newPolicyBindingSchema = z.object({
  resource: policyBindingResourceSchema,
  role: z.enum(Object.values(Roles) as [string, ...string[]], {
    error: 'Role is required.',
  }),
  subjects: z
    .array(policyBindingSubjectSchema)
    .min(1, { message: 'At least one subject is required' }),
});

export type NewPolicyBindingSchema = z.infer<typeof newPolicyBindingSchema>;
export type PolicyBindingSubjectSchema = z.infer<typeof policyBindingSubjectSchema>;
export type PolicyBindingResourceSchema = z.infer<typeof policyBindingResourceSchema>;
