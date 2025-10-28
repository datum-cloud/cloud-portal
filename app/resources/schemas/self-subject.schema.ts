import { z } from 'zod';

// Common Kubernetes-style verbs supported by our access review
const SUPPORTED_VERBS = ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'] as const;

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
