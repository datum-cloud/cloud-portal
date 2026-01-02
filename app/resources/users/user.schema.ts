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

export type UserSchema = z.infer<typeof userSchema>;
export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>;

// Legacy enums
export enum RegistrationApproval {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Pending = 'Pending',
}

export enum LastLoginProvider {
  Google = 'google',
  Github = 'github',
}

// Legacy interfaces
export interface IUserPreferences {
  theme: ThemeValue;
  timezone: string;
  newsletter: boolean;
}

export interface IUser {
  sub?: string;
  email?: string;
  familyName?: string;
  givenName?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  fullName?: string;
  preferences?: IUserPreferences;
  onboardedAt?: string;
  registrationApproval?: RegistrationApproval;
  state?: string;
  lastLoginProvider?: LastLoginProvider;
  avatarUrl?: string;
}
