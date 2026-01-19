import { paginatedResponseSchema, resourceMetadataSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const contactGroupProviderSchema = z.object({
  id: z.string(),
  name: z.enum(['Loops']),
});

export const contactGroupResourceSchema = resourceMetadataSchema
  .omit({ description: true })
  .extend({
    visibility: z.enum(['public', 'private']),
    providers: z.array(contactGroupProviderSchema).optional(),
  });

export type ContactGroup = z.infer<typeof contactGroupResourceSchema>;

export const contactGroupListSchema = paginatedResponseSchema(contactGroupResourceSchema);
export type ContactGroupList = z.infer<typeof contactGroupListSchema>;

export const createContactGroupInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  visibility: z.enum(['public', 'private']),
  providers: z.array(contactGroupProviderSchema).optional(),
});

export type CreateContactGroupInput = z.infer<typeof createContactGroupInputSchema>;

export const updateContactGroupInputSchema = z.object({
  resourceVersion: z.string(),
  displayName: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  providers: z.array(contactGroupProviderSchema).optional(),
});

export type UpdateContactGroupInput = z.infer<typeof updateContactGroupInputSchema>;
