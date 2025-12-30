import { z } from 'zod';

export const projectSchema = z.object({
  name: z
    .string({ error: 'Resource ID is required.' })
    .min(6, { message: 'Resource ID must be at least 6 characters long.' })
    .max(30, { message: 'Resource ID must be less than 30 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Resource ID must be kebab-case, start with a letter, and end with a letter or number',
    }),
  description: z
    .string({ error: 'Project name is required.' })
    .max(100, { message: 'Project name must be less than 100 characters long.' }),
  orgEntityId: z.string().optional(),
});

export const updateProjectSchema = z.object({
  description: z
    .string({ error: 'Project name is required.' })
    .max(100, { message: 'Project name must be less than 100 characters long.' })
    .optional(),
});

export type ProjectSchema = z.infer<typeof projectSchema>;
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;
