import { fromGatewayUser, fromGatewayUserIdentity, type GatewayUser } from './user.adapter';
import { describe, expect, it } from 'bun:test';

describe('fromGatewayUser', () => {
  const base: GatewayUser = {
    name: 'user-1',
    uid: 'u-1',
    resourceVersion: '5',
    email: 'a@b.com',
    givenName: 'Ada',
    familyName: 'Lovelace',
    createdAt: '2024-01-01T00:00:00.000Z',
    theme: 'dark',
    timezone: 'America/New_York',
    newsletter: true,
    onboardedAt: '2024-02-02T00:00:00Z',
    registrationApproval: 'Approved',
    state: 'Active',
    avatarUrl: 'https://example.com/avatar.png',
    lastLoginProvider: 'google',
    nameReviewRequired: true,
  };

  it('maps all scalar fields', () => {
    const user = fromGatewayUser(base);
    expect(user.sub).toBe('user-1');
    expect(user.uid).toBe('u-1');
    expect(user.resourceVersion).toBe('5');
    expect(user.email).toBe('a@b.com');
    expect(user.givenName).toBe('Ada');
    expect(user.familyName).toBe('Lovelace');
    expect(user.fullName).toBe('Ada Lovelace');
    expect(user.state).toBe('Active');
    expect(user.avatarUrl).toBe('https://example.com/avatar.png');
    expect(user.lastLoginProvider).toBe('google');
    expect(user.registrationApproval).toBe('Approved');
    expect(user.onboardedAt).toBe('2024-02-02T00:00:00Z');
    expect(user.nameReviewRequired).toBe(true);
    expect(user.createdAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));
  });

  it('maps preferences from flat gateway fields', () => {
    const user = fromGatewayUser(base);
    expect(user.preferences!.theme).toBe('dark');
    expect(user.preferences!.timezone).toBe('America/New_York');
    expect(user.preferences!.newsletter).toBe(true);
  });

  it('applies preference defaults when fields are null', () => {
    const user = fromGatewayUser({
      ...base,
      theme: null,
      timezone: null,
      newsletter: null,
    });
    expect(user.preferences!.theme).toBe('system');
    expect(typeof user.preferences!.timezone).toBe('string');
    expect(user.preferences!.timezone.length).toBeGreaterThan(0);
    expect(user.preferences!.newsletter).toBe(false);
  });

  it('leaves optional fields undefined when null', () => {
    const user = fromGatewayUser({
      ...base,
      email: null,
      registrationApproval: null,
      lastLoginProvider: null,
      avatarUrl: null,
      onboardedAt: null,
      createdAt: null,
      uid: null,
      resourceVersion: null,
    });
    expect(user.email).toBeUndefined();
    expect(user.registrationApproval).toBeUndefined();
    expect(user.lastLoginProvider).toBeUndefined();
    expect(user.avatarUrl).toBeUndefined();
    expect(user.onboardedAt).toBeUndefined();
    expect(user.createdAt).toBeUndefined();
    expect(user.uid).toBeUndefined();
    expect(user.resourceVersion).toBeUndefined();
  });

  it('omits fullName when either name part is null', () => {
    expect(fromGatewayUser({ ...base, givenName: null }).fullName).toBeUndefined();
    expect(fromGatewayUser({ ...base, familyName: null }).fullName).toBeUndefined();
  });
});

describe('fromGatewayUserIdentity', () => {
  it('maps all fields', () => {
    const identity = fromGatewayUserIdentity({
      name: 'id-1',
      createdAt: '2024-01-01T00:00:00Z',
      userUID: 'u-1',
      providerID: 'p-1',
      providerName: 'google',
      username: 'ada',
    });
    expect(identity).toEqual({
      name: 'id-1',
      createdAt: '2024-01-01T00:00:00Z',
      userUID: 'u-1',
      providerID: 'p-1',
      providerName: 'google',
      username: 'ada',
    });
  });

  it('maps null fields to undefined', () => {
    const identity = fromGatewayUserIdentity({
      name: 'id-2',
      createdAt: null,
      userUID: null,
      providerID: null,
      providerName: null,
      username: null,
    });
    expect(identity.createdAt).toBeUndefined();
    expect(identity.userUID).toBeUndefined();
    expect(identity.providerID).toBeUndefined();
    expect(identity.providerName).toBeUndefined();
    expect(identity.username).toBeUndefined();
  });
});
