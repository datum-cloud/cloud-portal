import type { Invitation } from '@/resources/invitations/invitation.schema';
import { paths } from '@/utils/config/paths.config';

/**
 * The pending invitations a new user can accept right now: unexpired and
 * addressed to their email. Mirrors the checks the invitation accept page
 * makes, so onboarding never offers a Join button that would then fail.
 *
 * Email domain offers (organizations open to everyone at the user's domain)
 * count only when `includeEmailDomainOffers` is set, which follows
 * `EMAIL_DOMAIN_JOINING_ENABLED`.
 */
export function selectJoinableInvitations(
  invitations: Invitation[],
  email: string | undefined,
  now: Date = new Date(),
  { includeEmailDomainOffers = false }: { includeEmailDomainOffers?: boolean } = {}
): Invitation[] {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return [];

  return invitations.filter(
    (invitation) =>
      invitation.state === 'Pending' &&
      invitation.email.trim().toLowerCase() === normalizedEmail &&
      !(invitation.expirationDate && new Date(invitation.expirationDate) < now) &&
      (includeEmailDomainOffers || !invitation.emailDomain)
  );
}

/**
 * Where "create my own organization" goes from the invitations step. The
 * account step comes before invitations, so this skips straight past it.
 */
export const CREATE_OWN_ORGANIZATION_PATH = paths.onboarding.billing;
