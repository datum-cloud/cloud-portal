import { DateTime } from '@/components/date-time';
import { isInvitationExpired } from '@/resources/invitations/invitation.expiry';

/**
 * "Expires in 6 days" / "Expired 2 days ago", with the exact time in the
 * tooltip, so admins can see when an invitation stops working.
 */
export function InvitationExpiry({
  expirationDate,
  className,
}: {
  expirationDate: string;
  className?: string;
}) {
  const expired = isInvitationExpired(expirationDate);

  return (
    <span className={className}>
      {expired ? 'Expired' : 'Expires'}{' '}
      <DateTime date={expirationDate} variant="relative" addSuffix tooltip="alternate" />
    </span>
  );
}
