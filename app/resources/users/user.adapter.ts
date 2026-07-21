import type {
  User,
  UserPreferences,
  ThemeValue,
  RegistrationApprovalValue,
  LastLoginProviderValue,
  UserSchema,
  UserIdentity,
  UserActiveSession,
  Passkey,
} from './user.schema';
import {
  ComMiloapisGoMiloPkgApisIdentityV1Alpha1Session,
  ComMiloapisGoMiloPkgApisIdentityV1Alpha1SessionList,
  ComMiloapisGoMiloPkgApisIdentityV1Alpha1UserIdentity,
  ComMiloapisGoMiloPkgApisIdentityV1Alpha1UserIdentityList,
} from '@/modules/control-plane/identity/types.gen';
import { toBoolean } from '@/utils/helpers/text.helper';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';

/** Milo User CRD: set when givenName and familyName are identical (e.g. single IdP display name). */
export const USER_NAME_REVIEW_REQUIRED_ANNOTATION = 'iam.miloapis.com/name-review-required';

/** User-declared country (ISO 3166-1 alpha-2) collected during onboarding. */
export const USER_PROFILE_COUNTRY_ANNOTATION = 'profile/country';

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
    nameReviewRequired: metadata?.annotations?.[USER_NAME_REVIEW_REQUIRED_ANNOTATION] === 'true',
    country: metadata?.annotations?.[USER_PROFILE_COUNTRY_ANNOTATION],
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
  country?: string;
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
  if (input.country) {
    annotations[USER_PROFILE_COUNTRY_ANNOTATION] = input.country;
  }

  const metadata = Object.keys(annotations).length > 0 ? { annotations } : undefined;

  return {
    apiVersion: 'iam.miloapis.com/v1alpha1',
    kind: 'User',
    ...(metadata ? { metadata } : {}),
  };
}

/**
 * Transform UserIdentity to domain UserIdentity type
 */
export function toUserIdentity(
  raw: ComMiloapisGoMiloPkgApisIdentityV1Alpha1UserIdentity
): UserIdentity {
  const { metadata, status } = raw;

  return {
    name: metadata?.name ?? '',
    createdAt: metadata?.creationTimestamp ?? '',
    userUID: status?.userUID ?? '',
    providerID: status?.providerID ?? '',
    providerName: status?.providerName ?? '',
    username: status?.username ?? '',
  };
}

export function toUserIdentityList(
  raw: ComMiloapisGoMiloPkgApisIdentityV1Alpha1UserIdentityList
): UserIdentity[] {
  return raw.items.map(toUserIdentity);
}

/**
 * Raw milo `Passkey` kind, hand-rolled to the shape pinned in the Phase A
 * spec §2.1 because milo A1b hasn't shipped the generated client yet. Named
 * to match the hey-api convention used for UserIdentity/Session so this is
 * a drop-in delete once `bun run openapi` regenerates the real type —
 * VERIFY the generated name matches before deleting (see the gated
 * client-regen task in the Phase A portal plan).
 */
export interface ComMiloapisGoMiloPkgApisIdentityV1Alpha1Passkey {
  metadata: { name: string };
  status?: {
    displayName?: string;
    state?: 'Active' | 'Inactive';
  };
}

export interface ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyList {
  items: ComMiloapisGoMiloPkgApisIdentityV1Alpha1Passkey[];
}

/** Absent status.state defaults to 'Active' — display-only; the kind has no DELETE verb, so this is never a security decision. */
export function toPasskey(raw: ComMiloapisGoMiloPkgApisIdentityV1Alpha1Passkey): Passkey {
  return {
    id: raw.metadata?.name ?? '',
    displayName: raw.status?.displayName ?? '',
    state: raw.status?.state === 'Inactive' ? 'Inactive' : 'Active',
  };
}

export function toPasskeyList(raw: ComMiloapisGoMiloPkgApisIdentityV1Alpha1PasskeyList): Passkey[] {
  return raw.items.map(toPasskey);
}

export function toUserActiveSession(
  raw: ComMiloapisGoMiloPkgApisIdentityV1Alpha1Session
): UserActiveSession {
  const { metadata, status } = raw;
  const statusAny = status as { lastUpdatedAt?: string } | undefined;
  return {
    name: metadata?.name ?? '',
    createdAt: status?.createdAt ?? '',
    lastUpdatedAt: statusAny?.lastUpdatedAt ?? null,
    fingerprintID: status?.fingerprintID ?? null,
    ip: status?.ip ?? null,
    provider: status?.provider ?? '',
    userUID: status?.userUID ?? '',
  };
}

export function toUserActiveSessionList(
  raw: ComMiloapisGoMiloPkgApisIdentityV1Alpha1SessionList
): UserActiveSession[] {
  return raw.items.filter((item) => !item.metadata?.deletionTimestamp).map(toUserActiveSession);
}
