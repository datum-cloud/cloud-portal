import { isInvitationExpired } from '@/resources/invitations/invitation.expiry';
import type { Invitation } from '@/resources/invitations/invitation.schema';
import { AuthorizationError, NotFoundError } from '@/utils/errors';

/**
 * Why an invitation link can't be used to join.
 *
 * - `expired`: the invitee can still read the invitation, but its expiry has passed.
 * - `accepted` / `declined`: the invitee already answered it.
 * - `unreachable`: Milo refused to return it (403) or it no longer exists (404).
 *   Milo only lets the invitee read an invitation while it is live, so this is
 *   what an invitation that expired before they signed up looks like, as well
 *   as one that was replaced or sent to a different email address.
 */
export type UnusableInvitationReason = 'expired' | 'accepted' | 'declined' | 'unreachable';

export function getUnusableInvitationReason(
  invitation: Pick<Invitation, 'state' | 'expirationDate'>,
  now: Date = new Date()
): UnusableInvitationReason | null {
  if (invitation.state === 'Accepted') return 'accepted';
  if (invitation.state === 'Declined') return 'declined';
  if (isInvitationExpired(invitation.expirationDate, now)) return 'expired';
  return null;
}

/** A failed invitation read that means the link is dead, not that something broke. */
export function isUnreachableInvitationError(error: unknown): boolean {
  return error instanceof AuthorizationError || error instanceof NotFoundError;
}
