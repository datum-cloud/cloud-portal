import { resourceMetadataSchema, paginatedResponseSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const projectStatusSchema = z.enum(['Active', 'Pending', 'Deleting', 'Failed']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = resourceMetadataSchema.extend({
  organizationId: z.string(),
  status: z.any(), // Raw status object from API
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
});

export type Project = z.infer<typeof projectSchema>;

export const projectListSchema = paginatedResponseSchema(projectSchema);
export type ProjectList = z.infer<typeof projectListSchema>;

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(63, 'Name must be at most 63 characters')
    .regex(
      /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'Name must be lowercase, start with letter, use only letters, numbers, hyphens'
    ),
  description: z.string().max(500).optional(),
  organizationId: z.string().min(1, 'Organization ID is required'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// Form validation schemas (legacy)
export const projectFormSchema = z.object({
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

export const updateProjectFormSchema = z.object({
  description: z
    .string({ error: 'Project name is required.' })
    .max(100, { message: 'Project name must be less than 100 characters long.' })
    .optional(),
});

export type ProjectFormSchema = z.infer<typeof projectFormSchema>;
export type UpdateProjectFormSchema = z.infer<typeof updateProjectFormSchema>;
