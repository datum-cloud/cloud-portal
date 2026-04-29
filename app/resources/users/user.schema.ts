import { z } from 'zod';

// Theme value type
export const THEME_VALUES = ['dark', 'light', 'system'] as const;
export type ThemeValue = (typeof THEME_VALUES)[number];

// Registration approval enum values
export const REGISTRATION_APPROVAL_VALUES = ['Approved', 'Rejected', 'Pending'] as const;
export type RegistrationApprovalValue = (typeof REGISTRATION_APPROVAL_VALUES)[number];

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
  registrationApproval: z.enum(REGISTRATION_APPROVAL_VALUES).optional(),
  state: z.string().optional(),
  lastLoginProvider: z.enum(LAST_LOGIN_PROVIDER_VALUES).optional(),
  avatarUrl: z.string().optional(),
  nameReviewRequired: z.boolean().optional(),
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
};

// Form validation schemas
export const userSchema = z.object({
  firstName: z.string({ error: 'First name is required.' }).min(3).max(50),
  lastName: z.string({ error: 'Last name is required.' }).min(3).max(50),
  email: z.string({ error: 'Email is required.' }).email(),
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
// Legacy enums
export enum RegistrationApproval {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Pending = 'Pending',
}
