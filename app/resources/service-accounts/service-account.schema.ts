import { z } from 'zod';

export const serviceAccountCreateSchema = z.object({
  name: z
    .string({ error: 'Name is required.' })
    .min(1, 'Name is required.')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'Name must be lowercase alphanumeric with hyphens, starting and ending with a letter or number.'
    ),
  displayName: z.string().optional(),
});

export type ServiceAccountCreateSchema = z.infer<typeof serviceAccountCreateSchema>;

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
