import {
  toPasskey,
  toPasskeyList,
  toUpdateUserPayload,
  toUpdateUserPreferencesPayload,
  toUser,
  toUserActiveSessionList,
  toUserIdentity,
  toUserIdentityList,
  USER_NAME_REVIEW_REQUIRED_ANNOTATION,
  USER_PROFILE_COUNTRY_ANNOTATION,
} from './user.adapter';
import { describe, expect, it } from 'bun:test';

describe('toUser', () => {
  it('maps spec/status and reads preferences + flags from annotations', () => {
    const raw = {
      metadata: {
        name: 'user-1',
        uid: 'u-1',
        resourceVersion: '5',
        creationTimestamp: '2024-01-01T00:00:00.000Z',
        annotations: {
          'preferences/theme': 'dark',
          'preferences/timezone': 'America/New_York',
          'preferences/newsletter': 'true',
          'onboarding/completedAt': '2024-02-02T00:00:00Z',
          [USER_NAME_REVIEW_REQUIRED_ANNOTATION]: 'true',
          [USER_PROFILE_COUNTRY_ANNOTATION]: 'US',
        },
      },
      spec: { email: 'a@b.com', givenName: 'Ada', familyName: 'Lovelace' },
      status: { registrationApproval: 'Approved', state: 'Active', lastLoginProvider: 'google' },
    };
    const user = toUser(raw as never);

    expect(user.sub).toBe('user-1');
    expect(user.fullName).toBe('Ada Lovelace');
    expect(user.preferences!.theme).toBe('dark');
    expect(user.preferences!.timezone).toBe('America/New_York');
    expect(user.preferences!.newsletter).toBe(true);
    expect(user.onboardedAt).toBe('2024-02-02T00:00:00Z');
    expect(user.registrationApproval).toBe('Approved');
    expect(user.lastLoginProvider).toBe('google');
    expect(user.nameReviewRequired).toBe(true);
    expect(user.country).toBe('US');
  });

  it('applies preference defaults and leaves status-derived fields undefined', () => {
    const raw = {
      metadata: { name: 'user-2', annotations: {} },
      spec: { email: 'x@y.com', givenName: 'X', familyName: 'Y' },
      status: {},
    };
    const user = toUser(raw as never);

    expect(user.preferences!.theme).toBe('system');
    expect(typeof user.preferences!.timezone).toBe('string');
    expect(user.preferences!.timezone.length).toBeGreaterThan(0);
    expect(user.preferences!.newsletter).toBe(false);
    expect(user.registrationApproval).toBeUndefined();
    expect(user.lastLoginProvider).toBeUndefined();
    expect(user.nameReviewRequired).toBe(false);
  });
});

describe('toUpdateUserPayload', () => {
  it('maps first/last name to given/family name', () => {
    expect(
      toUpdateUserPayload({ firstName: 'Ada', lastName: 'Lovelace', email: 'a@b.com' } as never)
    ).toEqual({
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'User',
      spec: { familyName: 'Lovelace', givenName: 'Ada', email: 'a@b.com' },
    });
  });
});

describe('toUpdateUserPreferencesPayload', () => {
  it('includes only the annotations for provided preferences', () => {
    const payload = toUpdateUserPreferencesPayload({ theme: 'dark', newsletter: false });
    expect(payload.metadata?.annotations).toEqual({
      'preferences/theme': 'dark',
      'preferences/newsletter': 'false',
    });
  });

  it('stamps profile country when provided', () => {
    const payload = toUpdateUserPreferencesPayload({ country: 'GB' });
    expect(payload.metadata?.annotations).toEqual({
      [USER_PROFILE_COUNTRY_ANNOTATION]: 'GB',
    });
  });

  it('stamps timezone and onboarding annotations when provided', () => {
    const payload = toUpdateUserPreferencesPayload({
      timezone: 'America/New_York',
      onboardedAt: '2024-02-02T00:00:00Z',
    });
    expect(payload.metadata?.annotations).toEqual({
      'preferences/timezone': 'America/New_York',
      'onboarding/completedAt': '2024-02-02T00:00:00Z',
    });
  });

  it('omits metadata entirely when no preferences are provided', () => {
    expect(toUpdateUserPreferencesPayload({})).toEqual({
      apiVersion: 'iam.miloapis.com/v1alpha1',
      kind: 'User',
    });
  });
});

describe('toUserIdentity', () => {
  it('maps identity status fields with empty-string defaults', () => {
    const identity = toUserIdentity({
      metadata: { name: 'id-1' },
      status: { userUID: 'u1', providerID: 'p1', providerName: 'google', username: 'ada' },
    } as never);
    expect(identity).toEqual({
      name: 'id-1',
      createdAt: '',
      userUID: 'u1',
      providerID: 'p1',
      providerName: 'google',
      username: 'ada',
    });
  });

  it('maps a list of identities', () => {
    const list = toUserIdentityList({
      items: [{ metadata: { name: 'id-1' }, status: {} }],
    } as never);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('id-1');
  });
});

describe('toUserActiveSessionList', () => {
  it('drops sessions that are being deleted', () => {
    const raw = {
      items: [
        { metadata: { name: 'live' }, status: { provider: 'google', userUID: 'u1' } },
        { metadata: { name: 'gone', deletionTimestamp: '2024-02-02T00:00:00Z' }, status: {} },
      ],
    };
    const sessions = toUserActiveSessionList(raw as never);
    expect(sessions.map((s) => s.name)).toEqual(['live']);
    expect(sessions[0].fingerprintID).toBeNull();
  });
});

describe('toPasskey', () => {
  it('maps metadata.name to id and status fields to displayName/state/userUID', () => {
    const raw = {
      metadata: { name: 'passkey-1' },
      status: {
        displayName: 'MacBook Pro (Touch ID)',
        state: 'Active' as const,
        userUID: 'user-uid-1',
      },
    };
    const passkey = toPasskey(raw);

    expect(passkey.id).toBe('passkey-1');
    expect(passkey.displayName).toBe('MacBook Pro (Touch ID)');
    expect(passkey.state).toBe('Active');
    expect(passkey.userUID).toBe('user-uid-1');
  });

  it('maps an explicit Inactive state', () => {
    const raw = {
      metadata: { name: 'passkey-2' },
      status: { displayName: 'Old Phone', state: 'Inactive' as const },
    };

    expect(toPasskey(raw).state).toBe('Inactive');
  });

  it('defaults state to Active and displayName/userUID to empty strings when status is absent', () => {
    const raw = { metadata: { name: 'passkey-3' } };
    const passkey = toPasskey(raw);

    expect(passkey.state).toBe('Active');
    expect(passkey.displayName).toBe('');
    expect(passkey.userUID).toBe('');
  });
});

describe('toPasskeyList', () => {
  it('maps a raw list to domain Passkey[]', () => {
    const raw = {
      items: [
        {
          metadata: { name: 'p-1' },
          status: { displayName: 'A', state: 'Active' as const, userUID: 'u-1' },
        },
        {
          metadata: { name: 'p-2' },
          status: { displayName: 'B', state: 'Inactive' as const, userUID: 'u-1' },
        },
      ],
    };
    const list = toPasskeyList(raw);

    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('p-1');
    expect(list[0].userUID).toBe('u-1');
    expect(list[1].state).toBe('Inactive');
  });

  it('returns an empty array for an empty list', () => {
    expect(toPasskeyList({ items: [] })).toEqual([]);
  });
});
