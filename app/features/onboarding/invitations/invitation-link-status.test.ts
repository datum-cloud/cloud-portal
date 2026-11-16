import {
  getUnusableInvitationReason,
  isUnreachableInvitationError,
} from './invitation-link-status';
import { AppError, AuthorizationError, NotFoundError } from '@/utils/errors';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-11-16T12:00:00Z');

describe('getUnusableInvitationReason', () => {
  it('returns null for a pending invitation that has not expired', () => {
    expect(
      getUnusableInvitationReason({ state: 'Pending', expirationDate: '2026-11-20T00:00:00Z' }, NOW)
    ).toBeNull();
  });

  it('returns null for a pending invitation with no expiry', () => {
    expect(getUnusableInvitationReason({ state: 'Pending' }, NOW)).toBeNull();
  });

  it('flags a pending invitation past its expiry', () => {
    expect(
      getUnusableInvitationReason({ state: 'Pending', expirationDate: '2026-11-15T00:00:00Z' }, NOW)
    ).toBe('expired');
  });

  it('reports an answered invitation as answered even once it has expired', () => {
    const expiry = '2026-11-15T00:00:00Z';
    expect(getUnusableInvitationReason({ state: 'Accepted', expirationDate: expiry }, NOW)).toBe(
      'accepted'
    );
    expect(getUnusableInvitationReason({ state: 'Declined', expirationDate: expiry }, NOW)).toBe(
      'declined'
    );
  });
});

describe('isUnreachableInvitationError', () => {
  it('treats 403 and 404 as a dead link', () => {
    expect(isUnreachableInvitationError(new AuthorizationError())).toBe(true);
    expect(isUnreachableInvitationError(new NotFoundError('Resource'))).toBe(true);
  });

  it('leaves other failures to the generic error path', () => {
    expect(isUnreachableInvitationError(new AppError('boom', { status: 500 }))).toBe(false);
    expect(isUnreachableInvitationError(new Error('boom'))).toBe(false);
  });
});
