import { z } from 'zod';

/**
 * The address fields AddressFields edits, with the limits billing and the
 * organization API share. Forms spread these into their own schema and add
 * their own rule for `country`, which some require and others don't.
 */
export const addressSchemaFields = {
  country: z
    .string()
    .refine((val) => val === '' || /^[A-Z]{2}$/.test(val), 'Pick a country from the list')
    .optional(),
  line1: z.string().max(256, 'Address line 1 is too long (256 characters max)').optional(),
  line2: z.string().max(256, 'Address line 2 is too long (256 characters max)').optional(),
  city: z.string().max(128, 'City is too long (128 characters max)').optional(),
  region: z.string().max(128, 'State or region is too long (128 characters max)').optional(),
  postalCode: z.string().max(32, 'Postal code is too long (32 characters max)').optional(),
};
