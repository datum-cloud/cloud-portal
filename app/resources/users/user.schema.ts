import { z } from 'zod';

// Theme value type
export const THEME_VALUES = ['dark', 'light', 'system'] as const;
export type ThemeValue = (typeof THEME_VALUES)[number];

// Platform access enum values
export const PLATFORM_ACCESS_VALUES = ['Approved', 'Rejected', 'Pending', 'Suspended'] as const;
export type PlatformAccessValue = (typeof PLATFORM_ACCESS_VALUES)[number];

// Last login provider values
export const LAST_LOGIN_PROVIDER_VALUES = ['google', 'github'] as const;
export type LastLoginProviderValue = (typeof LAST_LOGIN_PROVIDER_VALUES)[number];

// User preferences schema
export const userPreferencesResourceSchema = z.object({
  theme: z.enum(THEME_VALUES),
  timezone: z.string(),
  newsletter: z.boolean(),
});

export type UserPreferences = z.infer<typeof userPreferencesResourceSchema>;

// User resource schema
export const userResourceSchema = z.object({
  sub: z.string().optional(),
  email: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  uid: z.string().optional(),
  resourceVersion: z.string().optional(),
  fullName: z.string().optional(),
  preferences: userPreferencesResourceSchema.optional(),
  onboardedAt: z.string().optional(),
  platformAccess: z.enum(PLATFORM_ACCESS_VALUES).optional(),
  state: z.string().optional(),
  lastLoginProvider: z.enum(LAST_LOGIN_PROVIDER_VALUES).optional(),
  avatarUrl: z.string().optional(),
  nameReviewRequired: z.boolean().optional(),
  /**
   * The email gate's signal. Not a milo field — it comes from the id_token's
   * `email_verified` claim, overlaid onto the User by `getUserWithAccessRetry`.
   * Optional because fixtures and `buildDevStubUser` construct a User by hand;
   * every consumer treats absent as unverified.
   */
  emailVerified: z.boolean().optional(),
  /** ISO 3166-1 alpha-2 code from `metadata.annotations['profile/country']`. */
  country: z.string().optional(),
});

export type User = z.infer<typeof userResourceSchema>;

// Input types for service operations
export type UpdateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
};

export type UpdateUserPreferencesInput = {
  theme?: ThemeValue;
  timezone?: string;
  newsletter?: boolean;
  onboardedAt?: string;
  /** ISO 3166-1 alpha-2 code stored as `profile/country`. */
  country?: string;
};

// Emails, @handles and links are never names — they leak into member lists and invoices.
const NOT_A_NAME_PATTERN = /@|:\/\/|^www\./i;
// A letter in any script, then letters, combining marks, spaces, hyphens, apostrophes or
// periods. Keep in sync with milo's userNameNeedsReview: a name this accepts must not be
// flagged for review there, or the user is redirected back to the profile screen forever.
const PERSON_NAME_PATTERN = /^\p{L}[\p{L}\p{M} .'’-]*$/u;

const personNameField = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, { error: `${label} is required.` })
    .max(50)
    .refine((value) => !NOT_A_NAME_PATTERN.test(value), {
      error: `${label} can't be an email address or link.`,
      abort: true,
    })
    .refine((value) => PERSON_NAME_PATTERN.test(value), {
      error: `${label} can only contain letters, spaces, hyphens, apostrophes and periods.`,
    });

// Form validation schemas
export const userSchema = z
  .object({
    firstName: personNameField('First name'),
    lastName: personNameField('Last name'),
    email: z.string({ error: 'Email is required.' }).email(),
  })
  // milo flags identical names for review, so saving one would loop back to this form.
  .refine((data) => data.firstName.toLowerCase() !== data.lastName.toLowerCase(), {
    error: 'First and last name must be different.',
    path: ['lastName'],
  });

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z.string().optional(),
  newsletter: z.boolean().optional(),
  onboardedAt: z.string().optional(),
});

export const userIdentitySchema = z.object({
  name: z.string(),
  createdAt: z.string().optional(),
  username: z.string().optional(),
  userUID: z.string().optional(),
  providerID: z.string().optional(),
  providerName: z.string().optional(),
});

export const PASSKEY_STATE_VALUES = ['Active', 'Inactive'] as const;
export type PasskeyStateValue = (typeof PASSKEY_STATE_VALUES)[number];

export const passkeySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  state: z.enum(PASSKEY_STATE_VALUES),
  /** Owning user's UID — backs the `status.userUID=<uid>` field selector for cross-user MiloSAR reads, mirroring Session/UserIdentity. */
  userUID: z.string(),
});

export type Passkey = z.infer<typeof passkeySchema>;

export const parsedUserAgentSchema = z.object({
  browser: z.string().nullable().optional(),
  os: z.string().nullable().optional(),
  formatted: z.string(),
});

export const geoLocationSchema = z.object({
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
  formatted: z.string(),
});

export const userActiveSessionSchema = z.object({
  // `name` is kept for compatibility with consumers that key off the
  // identity-API resource name (e.g. comparing against the OIDC `sid`).
  // The GraphQL gateway returns this same value as `id`.
  name: z.string(),
  createdAt: z.string().optional(),
  lastUpdatedAt: z.string().nullable().optional(),
  fingerprintID: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  provider: z.string().optional(),
  userUID: z.string().optional(),
  userAgent: parsedUserAgentSchema.nullable().optional(),
  location: geoLocationSchema.nullable().optional(),
});

export type UserSchema = z.infer<typeof userSchema>;
export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>;
export type UserIdentity = z.infer<typeof userIdentitySchema>;
export type ParsedUserAgent = z.infer<typeof parsedUserAgentSchema>;
export type GeoLocation = z.infer<typeof geoLocationSchema>;
export type UserActiveSession = z.infer<typeof userActiveSessionSchema>;
// Platform access enums
export enum PlatformAccess {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Pending = 'Pending',
  Suspended = 'Suspended',
}
