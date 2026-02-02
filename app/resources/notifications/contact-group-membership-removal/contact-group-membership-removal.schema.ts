import { paginatedResponseSchema, resourceMetadataSchema } from '@/resources/base/base.schema';
import { z } from 'zod';

export const contactGroupMembershipRemovalResourceSchema = resourceMetadataSchema
  .omit({ description: true })
  .extend({
    contactGroupName: z.string(),
    contactName: z.string(),
    username: z.string().optional(),
  });

export type ContactGroupMembershipRemoval = z.infer<
  typeof contactGroupMembershipRemovalResourceSchema
>;

export const contactGroupMembershipRemovalListSchema = paginatedResponseSchema(
  contactGroupMembershipRemovalResourceSchema
);
export type ContactGroupMembershipRemovalList = z.infer<
  typeof contactGroupMembershipRemovalListSchema
>;

export const createContactGroupMembershipRemovalInputSchema = z.object({
  /** Resource name */
  name: z.string().min(1, 'Name is required'),
  contactGroupName: z.string().min(1, 'Contact group is required'),
  contactName: z.string().min(1, 'Contact is required'),
  /** Namespace where the Contact lives; used for spec.contactRef.namespace. */
  contactNamespace: z.string().min(1, 'Contact namespace is required'),
});

export type CreateContactGroupMembershipRemovalInput = z.infer<
  typeof createContactGroupMembershipRemovalInputSchema
>;
