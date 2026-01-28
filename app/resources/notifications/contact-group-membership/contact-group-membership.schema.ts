import { paginatedResponseSchema, resourceMetadataSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const contactGroupMembershipResourceSchema = resourceMetadataSchema
  .omit({ description: true })
  .extend({
    contactGroupName: z.string(),
    contactName: z.string(),
    username: z.string().optional(),
  });

export type ContactGroupMembership = z.infer<typeof contactGroupMembershipResourceSchema>;

export const contactGroupMembershipListSchema = paginatedResponseSchema(
  contactGroupMembershipResourceSchema
);
export type ContactGroupMembershipList = z.infer<typeof contactGroupMembershipListSchema>;

export const createContactGroupMembershipInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactGroupName: z.string().min(1, 'Contact group is required'),
  contactName: z.string().min(1, 'Contact is required'),
});

export type CreateContactGroupMembershipInput = z.infer<
  typeof createContactGroupMembershipInputSchema
>;
