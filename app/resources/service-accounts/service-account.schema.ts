import { nameSchema } from '../base';
import { z } from 'zod';

// Use-case classification stamped onto a ServiceAccount when created via a
// use-case-aware client (web, CLI, terraform). Surfaces user intent on the
// resource itself so consumers can group/filter accounts by purpose.
export const useCaseSchema = z.enum(['cicd', 'service']);

export type UseCase = z.infer<typeof useCaseSchema>;

export const serviceAccountCreateSchema = z
  .object({
    displayName: z
      .string({ error: 'Display name is required.' })
      .min(1, 'Display name is required.')
      .max(100, 'Display name must be at most 100 characters'),
  })
  .and(nameSchema);

export type ServiceAccountCreateSchema = z.infer<typeof serviceAccountCreateSchema>;

// `displayName` is OPTIONAL on update (older accounts created via CLI /
// terraform / pre-rename portal may have no description annotation; the
// edit form must allow saving without forcing the user to invent one).
// `serviceAccountCreateSchema` keeps it required for the auto-generate UX.
export const serviceAccountUpdateSchema = z.object({
  displayName: z.string().optional(),
});

export type ServiceAccountUpdateSchema = z.infer<typeof serviceAccountUpdateSchema>;

export const serviceAccountKeyCreateSchema = z.object({
  name: z.string({ error: 'Name is required.' }).min(1, 'Name is required.'),
  type: z.enum(['datum-managed', 'user-managed']).default('datum-managed'),
  publicKey: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type ServiceAccountKeyCreateSchema = z.infer<typeof serviceAccountKeyCreateSchema>;
