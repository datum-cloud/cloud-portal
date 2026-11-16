/**
 * How long a new invitation stays open. Most invitees have to create a Datum
 * account before they can accept, and Milo only lets them read the invitation
 * once their user exists and it is still live, so this has to cover sign-up
 * as well as acceptance. staff-portal's resend uses the same lifetime.
 */
export const INVITATION_LIFETIME_DAYS = 7;

/**
 * Marks an invitation created to replace an earlier one, naming the one it
 * replaces. Milo's activity policy shows such a create as "resent the
 * invitation" rather than a new invitation.
 */
export const INVITATION_RESENT_FROM_ANNOTATION = 'iam.miloapis.com/resent-from';

export function isInvitationExpired(
  expirationDate: string | undefined,
  now: Date = new Date()
): boolean {
  return !!expirationDate && new Date(expirationDate) < now;
}
