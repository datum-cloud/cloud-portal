import { z } from 'zod';

export const organizationMetadataSchema = z.object({
  name: z
    .string({ required_error: 'Resource name is required.' })
    .min(6, { message: 'Resource name must be at least 6 characters long.' })
    .max(30, { message: 'Resource name must be less than 30 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Resource name must be kebab-case, start with a letter, and end with a letter or number',
    }),
  labels: z.array(z.string()).optional(),
  annotations: z.array(z.string()).optional(),
});

export const organizationSchema = z
  .object({
    description: z
      .string({ required_error: 'Description is required.' })
      .max(100, { message: 'Description must be less than 100 characters long.' }),
    resourceVersion: z.string().optional(),
  })
  .and(organizationMetadataSchema);

export const updateOrganizationSchema = z.object({
  description: z
    .string({ required_error: 'Description is required.' })
    .max(100, { message: 'Description must be less than 100 characters long.' })
    .optional(),
  labels: z.array(z.string()).optional(),
});

export type OrganizationSchema = z.infer<typeof organizationSchema>;
export type UpdateOrganizationSchema = z.infer<typeof updateOrganizationSchema>;
