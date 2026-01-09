import type {
  User,
  UserPreferences,
  ThemeValue,
  RegistrationApprovalValue,
  LastLoginProviderValue,
  UserSchema,
} from './user.schema';
import { toBoolean } from '@/utils/helpers/text.helper';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';

// Raw API user type
export interface ComMiloapisIamV1Alpha1User {
  apiVersion: string;
  kind: string;
  metadata: {
    creationTimestamp: Date;
    generation: number;
    name: string;
    resourceVersion: string;
    uid: string;
    annotations: Record<string, string>;
  };
  spec: {
    email: string;
    familyName: string;
    givenName: string;
  };
  status: {
    registrationApproval: 'Approved' | 'Rejected' | 'Pending';
    state: string;
    avatarUrl?: string;
    lastLoginProvider?: 'google' | 'github';
  };
}

/**
 * Transform raw API User to domain User type
 */
export function toUser(raw: ComMiloapisIamV1Alpha1User): User {
  const { metadata, spec, status } = raw;

  const preferences: UserPreferences = {
    theme: (metadata?.annotations?.['preferences/theme'] ?? 'system') as ThemeValue,
    timezone: metadata?.annotations?.['preferences/timezone'] ?? getBrowserTimezone(),
    newsletter: toBoolean(metadata?.annotations?.['preferences/newsletter']),
  };

  return {
    sub: metadata?.name,
    email: spec?.email,
    familyName: spec?.familyName,
    givenName: spec?.givenName,
    createdAt: metadata?.creationTimestamp ?? new Date(),
    uid: metadata?.uid ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    fullName: `${spec?.givenName} ${spec?.familyName}`,
    preferences,
    onboardedAt: metadata?.annotations?.['onboarding/completedAt'],
    registrationApproval:
      status && typeof status.registrationApproval !== 'undefined'
        ? (status.registrationApproval as RegistrationApprovalValue)
        : undefined,
    state: status?.state,
    avatarUrl: status?.avatarUrl,
    lastLoginProvider:
      status && typeof status.lastLoginProvider !== 'undefined'
        ? (status.lastLoginProvider as LastLoginProviderValue)
        : undefined,
  };
}

/**
 * Transform UserSchema to API patch payload
 */
export function toUpdateUserPayload(input: UserSchema): {
  apiVersion: string;
  kind: string;
  spec: { familyName: string; givenName: string; email: string };
} {
  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'User',
    spec: {
      familyName: input.lastName,
      givenName: input.firstName,
      email: input.email,
    },
  };
}

/**
 * Transform UpdateUserPreferencesInput to API patch payload
 */
export function toUpdateUserPreferencesPayload(input: {
  theme?: string;
  timezone?: string;
  newsletter?: boolean;
  onboardedAt?: string;
}): { apiVersion: string; kind: string; metadata?: { annotations: Record<string, string> } } {
  const annotations: Record<string, string> = {};

  if (input.theme) {
    annotations['preferences/theme'] = input.theme;
  }
  if (input.timezone) {
    annotations['preferences/timezone'] = input.timezone;
  }
  if (typeof input.newsletter === 'boolean') {
    annotations['preferences/newsletter'] = String(input.newsletter);
  }
  if (input.onboardedAt) {
    annotations['onboarding/completedAt'] = input.onboardedAt;
  }

  const metadata = Object.keys(annotations).length > 0 ? { annotations } : undefined;

  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'User',
    ...(metadata ? { metadata } : {}),
  };
}
