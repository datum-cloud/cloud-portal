import { z } from 'zod';

export const orgContactInfoSchema = z.object({
  email: z.email({ error: 'Enter your email address' }).min(1, 'Enter your email address'),
  name: z
    .string({ error: 'Enter a contact name' })
    .min(1, 'Enter a contact name')
    .max(256, 'Name is too long (256 characters max)'),
  businessName: z.string().max(256, 'Business name is too long (256 characters max)').optional(),
  country: z
    .string()
    .refine((val) => val === '' || /^[A-Z]{2}$/.test(val), 'Pick a country from the list')
    .optional(),
  line1: z.string().max(256, 'Address line 1 is too long (256 characters max)').optional(),
  line2: z.string().max(256, 'Address line 2 is too long (256 characters max)').optional(),
  city: z.string().max(128, 'City is too long (128 characters max)').optional(),
  region: z.string().max(128, 'State or region is too long (128 characters max)').optional(),
  postalCode: z.string().max(32, 'Postal code is too long (32 characters max)').optional(),
});

export type OrgContactInfoValues = z.infer<typeof orgContactInfoSchema>;

export const buildOrgContactDefaults = (
  defaults?: Partial<OrgContactInfoValues>
): OrgContactInfoValues => ({
  email: defaults?.email ?? '',
  name: defaults?.name ?? '',
  businessName: defaults?.businessName ?? '',
  country: defaults?.country ?? '',
  line1: defaults?.line1 ?? '',
  line2: defaults?.line2 ?? '',
  city: defaults?.city ?? '',
  region: defaults?.region ?? '',
  postalCode: defaults?.postalCode ?? '',
});

export const isOrgContactInfoComplete = (
  values: OrgContactInfoValues | null | undefined
): boolean => Boolean(values?.email?.trim() && values?.name?.trim());

export const formatOrgContactPrimaryLine = (values: OrgContactInfoValues): string => {
  const business = values.businessName?.trim();
  if (business) return business;
  return values.email.trim();
};

export const formatOrgContactSecondaryLine = (values: OrgContactInfoValues): string => {
  const parts = [
    values.name?.trim(),
    values.line1?.trim(),
    values.line2?.trim(),
    values.city?.trim(),
    values.region?.trim(),
    values.postalCode?.trim(),
  ].filter(Boolean);
  return parts.join(', ');
};

/** Org display name for provisioning step — business name preferred. */
export const orgDisplayNameFromContact = (values: OrgContactInfoValues): string =>
  values.businessName?.trim() || values.name.trim();
