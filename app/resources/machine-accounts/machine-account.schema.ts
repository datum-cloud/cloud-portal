import { z } from 'zod';

export const machineAccountCreateSchema = z.object({
  name: z
    .string({ error: 'Name is required.' })
    .min(1, 'Name is required.')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'Name must be lowercase alphanumeric with hyphens, starting and ending with a letter or number.'
    ),
  displayName: z.string().optional(),
});

export type MachineAccountCreateSchema = z.infer<typeof machineAccountCreateSchema>;

export const machineAccountUpdateSchema = z.object({
  displayName: z.string().optional(),
});

export type MachineAccountUpdateSchema = z.infer<typeof machineAccountUpdateSchema>;

export const machineAccountKeyCreateSchema = z.object({
  name: z.string({ error: 'Name is required.' }).min(1, 'Name is required.'),
  type: z.enum(['datum-managed', 'user-managed']).default('datum-managed'),
  publicKey: z.string().optional(),
  expiresAt: z.string().optional(),
});

export type MachineAccountKeyCreateSchema = z.infer<typeof machineAccountKeyCreateSchema>;
