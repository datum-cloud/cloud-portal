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

export const DEFAULT_ORG_CONTACT_COUNTRY = 'US';

export const buildOrgContactDefaults = (
  defaults?: Partial<OrgContactInfoValues>
): OrgContactInfoValues => ({
  email: defaults?.email ?? '',
  name: defaults?.name ?? '',
  businessName: defaults?.businessName ?? '',
  country: defaults?.country?.trim() || DEFAULT_ORG_CONTACT_COUNTRY,
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

/**
 * Display name for the first project created during onboarding.
 *
 * We use a neutral default rather than mirroring the org name so the org
 * (billing/team container) and its first project stay visually distinct in
 * the switcher. Users can rename either at any time.
 */
export const defaultOnboardingProjectDisplayName = (_values: OrgContactInfoValues): string =>
  'Default project';

export type OrganizationContactInfoPayload = {
  email: string;
  name: string;
  businessName?: string;
  address?: {
    country: string;
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
  };
};

/**
 * Flattens a nested `Organization.spec.contactInfo` back into the flat form
 * values the contact form edits. Inverse of `toOrganizationContactInfo` — used
 * to seed the org-settings contact card from an existing org.
 */
export const orgContactInfoToFormValues = (
  contactInfo:
    | (Partial<OrganizationContactInfoPayload> & {
        address?: OrganizationContactInfoPayload['address'];
      })
    | null
    | undefined
): Partial<OrgContactInfoValues> => ({
  email: contactInfo?.email ?? '',
  name: contactInfo?.name ?? '',
  businessName: contactInfo?.businessName ?? '',
  country: contactInfo?.address?.country ?? '',
  line1: contactInfo?.address?.line1 ?? '',
  line2: contactInfo?.address?.line2 ?? '',
  city: contactInfo?.address?.city ?? '',
  region: contactInfo?.address?.region ?? '',
  postalCode: contactInfo?.address?.postalCode ?? '',
});

/** Maps onboarding contact form values to Organization.spec.contactInfo. */
export const toOrganizationContactInfo = (
  values: OrgContactInfoValues
): OrganizationContactInfoPayload => {
  const contactInfo: OrganizationContactInfoPayload = {
    email: values.email.trim(),
    name: values.name.trim(),
  };

  const businessName = values.businessName?.trim();
  if (businessName) {
    contactInfo.businessName = businessName;
  }

  const country = values.country?.trim();
  if (country) {
    contactInfo.address = { country };
    const line1 = values.line1?.trim();
    const line2 = values.line2?.trim();
    const city = values.city?.trim();
    const region = values.region?.trim();
    const postalCode = values.postalCode?.trim();
    if (line1) contactInfo.address.line1 = line1;
    if (line2) contactInfo.address.line2 = line2;
    if (city) contactInfo.address.city = city;
    if (region) contactInfo.address.region = region;
    if (postalCode) contactInfo.address.postalCode = postalCode;
  }

  return contactInfo;
};

export type BillingAccountContactInfoPayload = {
  email: string;
  name: string;
  invoiceEmails: string[];
  businessName?: string;
  address?: OrganizationContactInfoPayload['address'];
};

/** Maps onboarding contact form values to BillingAccount.spec.contactInfo. */
export const toBillingAccountContactInfo = (
  values: OrgContactInfoValues
): BillingAccountContactInfoPayload => {
  const email = values.email.trim();
  const orgContact = toOrganizationContactInfo(values);
  return {
    email,
    name: orgContact.name,
    invoiceEmails: [email],
    ...(orgContact.businessName && { businessName: orgContact.businessName }),
    ...(orgContact.address && { address: orgContact.address }),
  };
};
