import type { Member } from '@/resources/members';

/**
 * Returns a human-readable display name for a member.
 * Falls back to email, then user ID.
 */
export function getMemberDisplayName(member: Member): string {
  return (
    `${member.user.givenName ?? ''} ${member.user.familyName ?? ''}`.trim() ||
    member.user.email ||
    member.user.id
  );
}
