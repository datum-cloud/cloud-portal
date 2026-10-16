import { selectJoinableInvitations } from './joinable-invitations';
import type { Invitation } from '@/resources/invitations/invitation.schema';
import { describe, expect, it } from 'bun:test';

const NOW = new Date('2026-10-15T12:00:00Z');

const invitation = (overrides: Partial<Invitation> = {}): Invitation => ({
  uid: 'uid',
  name: 'acme-abc123',
  namespace: 'organization-acme',
  resourceVersion: '1',
  email: 'teammate@acme.com',
  organizationName: 'acme',
  state: 'Pending',
  ...overrides,
});

describe('selectJoinableInvitations', () => {
  it('keeps pending, unexpired invitations addressed to the user', () => {
    const pending = invitation({ expirationDate: '2026-10-20T00:00:00Z' });
    expect(selectJoinableInvitations([pending], 'teammate@acme.com', NOW)).toEqual([pending]);
  });

  it('matches email case-insensitively', () => {
    const pending = invitation({ email: 'Teammate@Acme.com' });
    expect(selectJoinableInvitations([pending], 'teammate@acme.COM', NOW)).toEqual([pending]);
  });

  it('drops expired invitations', () => {
    const expired = invitation({ expirationDate: '2026-10-14T00:00:00Z' });
    expect(selectJoinableInvitations([expired], 'teammate@acme.com', NOW)).toEqual([]);
  });

  it('drops invitations that are no longer pending', () => {
    const accepted = invitation({ state: 'Accepted' });
    const declined = invitation({ state: 'Declined' });
    expect(selectJoinableInvitations([accepted, declined], 'teammate@acme.com', NOW)).toEqual([]);
  });

  it('drops invitations sent to a different address', () => {
    expect(selectJoinableInvitations([invitation()], 'someone@else.com', NOW)).toEqual([]);
  });

  it('returns nothing when the user has no email', () => {
    expect(selectJoinableInvitations([invitation()], undefined, NOW)).toEqual([]);
  });
});
