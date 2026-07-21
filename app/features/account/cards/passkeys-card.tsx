import { IdentityItem } from '../identity-item';
import { IdentityItemSkeleton } from '../identity-item-skeleton';
import { useApp } from '@/providers/app.provider';
import { usePasskeys, type PasskeyStateValue } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { env } from '@/utils/env';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ExternalLinkIcon, KeyRoundIcon } from 'lucide-react';

/**
 * Builds the auth-ui management link with a returnTo pointing back at this
 * page, per Phase A spec §3.1 ("Entry from portal:
 * /id/passkeys?returnTo=<portal-url>").
 */
function buildManagePasskeysUrl(): string {
  const returnTo = `${env.public.appUrl}${paths.account.settings.security}`;
  return `${env.public.authUiOrigin}/id/passkeys?returnTo=${encodeURIComponent(returnTo)}`;
}

function StateBadge({ state }: { state: PasskeyStateValue }) {
  return state === 'Active' ? (
    <Badge type="success" theme="light" className="text-[10px] font-bold uppercase">
      Active
    </Badge>
  ) : (
    <Badge type="muted" theme="light" className="text-[10px] font-bold uppercase">
      Inactive
    </Badge>
  );
}

export const AccountPasskeysCard = () => {
  const { user } = useApp();
  const { data: passkeys, isLoading } = usePasskeys(user?.sub ?? 'me');
  const manageUrl = buildManagePasskeysUrl();

  return (
    <Card data-e2e="account-passkeys-card" className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="flex-row items-center justify-between border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Passkeys</CardTitle>
        <LinkButton
          href={manageUrl}
          target="_blank"
          rel="noopener noreferrer"
          type="quaternary"
          theme="outline"
          size="xs"
          icon={<Icon icon={ExternalLinkIcon} size={12} />}
          iconPosition="right">
          Manage passkeys
        </LinkButton>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <IdentityItemSkeleton count={1} showActions={false} />
        ) : passkeys && passkeys.length > 0 ? (
          <div className="divide-stepper-line flex flex-col divide-y">
            {passkeys.map((passkey) => (
              <div key={passkey.id} data-e2e="account-passkey-item">
                <IdentityItem
                  className="px-5 py-4"
                  icon={<Icon icon={KeyRoundIcon} className="size-3.5" />}
                  label={passkey.displayName}
                  rightContent={<StateBadge state={passkey.state} />}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyContent
            title="No passkeys yet"
            subtitle="Add a passkey for faster, more secure sign-in."
            actions={[{ as: 'external-link', to: manageUrl, label: 'Add a passkey' }]}
            className="w-full border-0"
          />
        )}
      </CardContent>
    </Card>
  );
};
