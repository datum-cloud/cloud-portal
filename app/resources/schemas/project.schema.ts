import { z } from 'zod';

// Project metadata schema (without the generic name schema)
export const projectMetadataSchema = z.object({
  name: z
    .string({ error: 'Name is required.' })
    .min(6, { message: 'Name must be at least 6 characters long.' })
    .max(30, { message: 'Name must be less than 30 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message: 'Name must be kebab-case, start with a letter, and end with a letter or number',
    }),
  labels: z.array(z.string()).optional(),
  annotations: z.array(z.string()).optional(),
});

export const projectSchema = z
  .object({
    description: z
      .string({ error: 'Description is required.' })
      .max(100, { message: 'Description must be less than 100 characters long.' }),
    orgEntityId: z.string({ error: 'Organization ID is required.' }).optional(),
  })
  .and(projectMetadataSchema);

export const updateProjectSchema = z.object({
  description: z
    .string({ error: 'Description is required.' })
    .max(100, { message: 'Description must be less than 100 characters long.' })
    .optional(),
  labels: z.array(z.string()).optional(),
  annotations: z.array(z.string()).optional(),
});

export type ProjectSchema = z.infer<typeof projectSchema>;
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;
