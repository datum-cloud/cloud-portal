import { getUnusableInvitationReason } from './invitation-link-status';
import type { Invitation } from '@/resources/invitations/invitation.schema';
import { paths } from '@/utils/config/paths.config';

/**
 * The pending invitations a new user can accept right now: unexpired and
 * addressed to their email. Mirrors the checks the invitation accept page
 * makes, so onboarding never offers a Join button that would then fail.
 */
export function selectJoinableInvitations(
  invitations: Invitation[],
  email: string | undefined,
  now: Date = new Date()
): Invitation[] {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return [];

  return invitations.filter(
    (invitation) =>
      invitation.email.trim().toLowerCase() === normalizedEmail &&
      getUnusableInvitationReason(invitation, now) === null
  );
}

/**
 * Set on the account step when the user picks "create my own organization"
 * over their invitations, so the step does not send them straight back.
 */
export const SKIP_INVITATIONS_PARAM = 'skipInvitations';

export const CREATE_OWN_ORGANIZATION_PATH = `${paths.onboarding.account}?${SKIP_INVITATIONS_PARAM}=1`;
