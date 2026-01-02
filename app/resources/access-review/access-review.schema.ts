import { z } from 'zod';

// Common Kubernetes-style verbs supported by our access review
export const SUPPORTED_VERBS = [
  'get',
  'list',
  'watch',
  'create',
  'update',
  'patch',
  'delete',
] as const;
export type SupportedVerb = (typeof SUPPORTED_VERBS)[number];

// Access review result schema
export const accessReviewResultSchema = z.object({
  allowed: z.boolean(),
  denied: z.boolean(),
  namespace: z.string().optional(),
  verb: z.string().optional(),
  group: z.string().optional(),
  resource: z.string().optional(),
});

export type AccessReviewResult = z.infer<typeof accessReviewResultSchema>;

// Create access review input schema
export const createAccessReviewInputSchema = z.object({
  namespace: z.string(),
  verb: z.enum(SUPPORTED_VERBS),
  group: z.string(),
  resource: z.string(),
  name: z.string().optional(),
});

export type CreateAccessReviewInput = z.infer<typeof createAccessReviewInputSchema>;

// Self-subject access review schema (moved from legacy location)
export const createSelfSubjectAccessReviewSchema = z.object({
  namespace: z.string({ error: 'Namespace is required.' }),
  verb: z.enum(SUPPORTED_VERBS, { error: 'Verb is required.' }),
  group: z.string({ error: 'API group is required.' }),
  resource: z.string({ error: 'Resource is required.' }),
  name: z.string().optional(),
});

export type CreateSelfSubjectAccessReviewSchema = z.infer<
  typeof createSelfSubjectAccessReviewSchema
>;

// Legacy interface
export interface ICreateSelfSubjectAccessReviewResponse {
  allowed: boolean;
  denied: boolean;
  namespace?: string;
  verb?: string;
  group?: string;
  resource?: string;
}
