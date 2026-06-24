import type {
  User,
  UserPreferences,
  ThemeValue,
  RegistrationApprovalValue,
  LastLoginProviderValue,
  UserIdentity,
} from './user.schema';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';

export interface GatewayUser {
  name: string;
  uid: string | null;
  resourceVersion: string | null;
  email: string | null;
  givenName: string | null;
  familyName: string | null;
  createdAt: string | null;
  theme: string | null;
  timezone: string | null;
  newsletter: boolean | null;
  onboardedAt: string | null;
  registrationApproval: string | null;
  state: string | null;
  avatarUrl: string | null;
  lastLoginProvider: string | null;
  nameReviewRequired: boolean;
}

export interface GatewayUserIdentity {
  name: string;
  createdAt: string | null;
  userUID: string | null;
  providerID: string | null;
  providerName: string | null;
  username: string | null;
}

export function fromGatewayUser(raw: GatewayUser): User {
  const preferences: UserPreferences = {
    theme: (raw.theme ?? 'system') as ThemeValue,
    timezone: raw.timezone ?? getBrowserTimezone(),
    newsletter: raw.newsletter ?? false,
  };

  return {
    sub: raw.name,
    email: raw.email ?? undefined,
    familyName: raw.familyName ?? undefined,
    givenName: raw.givenName ?? undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : undefined,
    uid: raw.uid ?? undefined,
    resourceVersion: raw.resourceVersion ?? undefined,
    fullName: raw.givenName && raw.familyName ? `${raw.givenName} ${raw.familyName}` : undefined,
    preferences,
    onboardedAt: raw.onboardedAt ?? undefined,
    registrationApproval:
      raw.registrationApproval != null
        ? (raw.registrationApproval as RegistrationApprovalValue)
        : undefined,
    state: raw.state ?? undefined,
    avatarUrl: raw.avatarUrl ?? undefined,
    lastLoginProvider:
      raw.lastLoginProvider != null ? (raw.lastLoginProvider as LastLoginProviderValue) : undefined,
    nameReviewRequired: raw.nameReviewRequired,
  };
}

export function fromGatewayUserIdentity(raw: GatewayUserIdentity): UserIdentity {
  return {
    name: raw.name,
    createdAt: raw.createdAt ?? undefined,
    userUID: raw.userUID ?? undefined,
    providerID: raw.providerID ?? undefined,
    providerName: raw.providerName ?? undefined,
    username: raw.username ?? undefined,
  };
}
