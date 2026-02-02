import { paginatedResponseSchema, resourceMetadataSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const contactProviderSchema = z.object({
  id: z.string(),
  name: z.enum(['Resend', 'Loops']),
});

/**
 * Contact domain model (derived from notification.miloapis.com Contact CRD).
 */
export const contactResourceSchema = resourceMetadataSchema.omit({ description: true }).extend({
  email: z.string().email(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  /** Name of the referenced User (if set) */
  subjectName: z.string().optional(),
  providers: z.array(contactProviderSchema).optional(),
});

export type Contact = z.infer<typeof contactResourceSchema>;

export const contactListSchema = paginatedResponseSchema(contactResourceSchema);
export type ContactList = z.infer<typeof contactListSchema>;

export const createContactInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  /** If provided, links this contact to a User resource */
  subjectName: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const updateContactInputSchema = z.object({
  resourceVersion: z.string(),
  email: z.string().email('Valid email is required').optional(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;
