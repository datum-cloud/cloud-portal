import { resourceMetadataSchema, paginatedResponseSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const organizationTypeSchema = z.enum(['Personal', 'Standard']);
export type OrganizationType = z.infer<typeof organizationTypeSchema>;

export const organizationStatusSchema = z.enum(['Active', 'Suspended', 'Pending', 'Deleting']);
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;

export const organizationContactInfoSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(256),
  businessName: z.string().max(256).optional(),
  address: z
    .object({
      country: z.string().length(2),
      line1: z.string().max(256).optional(),
      line2: z.string().max(256).optional(),
      city: z.string().max(128).optional(),
      region: z.string().max(128).optional(),
      postalCode: z.string().max(32).optional(),
    })
    .optional(),
});

export type OrganizationContactInfo = z.infer<typeof organizationContactInfoSchema>;

export const organizationSchema = resourceMetadataSchema.extend({
  type: organizationTypeSchema.optional(),
  status: organizationStatusSchema,
  memberCount: z.number().optional(),
  projectCount: z.number().optional(),
  // `spec.contactInfo` on unified orgs. Read leniently: legacy orgs have none,
  // and we never want a malformed contact block to break loading the org, so
  // fall back to `undefined` instead of throwing on parse.
  contactInfo: organizationContactInfoSchema.optional().catch(undefined),
});

export type Organization = z.infer<typeof organizationSchema>;

export const organizationListSchema = paginatedResponseSchema(organizationSchema);
export type OrganizationList = z.infer<typeof organizationListSchema>;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(63, 'Name must be at most 63 characters')
    .regex(
      /^[a-z][a-z0-9-]*[a-z0-9]$/,
      'Name must be lowercase, start with letter, use only letters, numbers, hyphens'
    ),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  type: organizationTypeSchema.default('Standard'),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/** Unified org create for onboarding — server assigns an opaque name via generateName. */
export const createOnboardingOrganizationSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be at most 100 characters'),
  contactInfo: organizationContactInfoSchema,
});

export type CreateOnboardingOrganizationInput = z.infer<typeof createOnboardingOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  resourceVersion: z.string(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

// Form validation schemas (legacy)
export const organizationMetadataSchema = z.object({
  name: z
    .string({ error: 'Resource name is required.' })
    .min(6, { message: 'Resource name must be at least 6 characters long.' })
    .max(30, { message: 'Resource name must be less than 30 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Resource name must be kebab-case, start with a letter, and end with a letter or number',
    }),
  labels: z.array(z.string()).optional(),
  annotations: z.array(z.string()).optional(),
});

export const organizationFormSchema = z
  .object({
    description: z
      .string({ error: 'Organization name is required.' })
      .max(100, { message: 'Organization name must be less than 100 characters long.' }),
    resourceVersion: z.string().optional(),
  })
  .and(organizationMetadataSchema);

export const updateOrganizationFormSchema = z.object({
  description: z
    .string({ error: 'Organization name is required.' })
    .max(100, { message: 'Organization name must be less than 100 characters long.' })
    .optional(),
  labels: z.array(z.string()).optional(),
});

export type OrganizationFormSchema = z.infer<typeof organizationFormSchema>;
export type UpdateOrganizationFormSchema = z.infer<typeof updateOrganizationFormSchema>;
