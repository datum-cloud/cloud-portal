import { BadgeStatus } from '@/components/badge/badge-status';
import type { ServiceAccount } from '@/resources/service-accounts';

/**
 * The label the badge renders. Exported so a table column can sort and search
 * on the status an operator can actually see, rather than on `spec.state`.
 */
export function serviceAccountStatusLabel(account: ServiceAccount): string {
  if (account.status === 'Disabled') return 'Inactive';
  if (account.credentialState === 'expired') return 'Expired';
  if (account.credentialState === 'none') return 'No keys';
  return 'Active';
}

/**
 * The account status an operator actually needs: can this authenticate?
 *
 * `account.status` alone answers only whether an admin switched the account
 * off, so a disabled account reports Inactive and everything else is decided
 * by the keys. When the keys could not be read the badge falls back to the
 * admin state rather than guessing at a credential the portal has not seen.
 */
export function ServiceAccountStatusBadge({ account }: { account: ServiceAccount }) {
  if (account.status === 'Disabled') {
    return <BadgeStatus status="disabled" />;
  }

  if (account.credentialState === 'expired') {
    return (
      <BadgeStatus
        status="error"
        label="Expired"
        tooltipText="Every key on this account has expired, so it can no longer authenticate. Add a new key to restore access."
      />
    );
  }

  if (account.credentialState === 'none') {
    return (
      <BadgeStatus
        status="inactive"
        label="No keys"
        tooltipText="This account has no keys yet, so nothing can authenticate as it."
      />
    );
  }

  return <BadgeStatus status="active" />;
}
