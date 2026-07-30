import { IdentityItem } from '@/features/account/identity-item';
import { IdentityItemSkeleton } from '@/features/account/identity-item-skeleton';
import { GithubEmailTooltip, ProviderIcon } from '@/features/account/identity-providers';
import { buildSecurityReturnTo, buildSignInMethodRows } from '@/features/account/sign-in-methods';
import { useApp } from '@/providers/app.provider';
import { usePasskeys, useUserIdentities } from '@/resources/users';
import { env } from '@/utils/env';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ExternalLinkIcon } from 'lucide-react';

export const AccountSignInMethodSettingsCard = () => {
  const { user } = useApp();
  const userId = user?.sub ?? 'me';
  const identitiesQuery = useUserIdentities(userId);
  const passkeysQuery = usePasskeys(userId);

  const isLoading = identitiesQuery.isLoading || passkeysQuery.isLoading;
  const isError = identitiesQuery.isError || passkeysQuery.isError;

  const rows = buildSignInMethodRows({
    identities: identitiesQuery.data ?? [],
    passkeys: passkeysQuery.data ?? [],
    authUiOrigin: env.public.authUiOrigin,
    returnTo: buildSecurityReturnTo(env.public.appUrl),
  });

  return (
    <Card data-e2e="account-sign-in-methods-card" className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="gap-1 border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Sign-in Methods</CardTitle>
        <CardDescription className="text-1xs">
          Customize how you access your account. Link your Git profiles and set up passkeys for
          seamless, secure authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <IdentityItemSkeleton count={3} showActions />
        ) : isError ? (
          // Never fall through to an empty list: a blank Sign-in Methods card
          // reads as "you have no sign-in methods", which is false and alarming.
          <p role="alert" className="text-foreground/80 text-1xs px-5 py-4">
            We couldn&apos;t load your sign-in methods. Refresh the page to try again.
          </p>
        ) : (
          <div className="divide-stepper-line flex flex-col divide-y">
            {rows.map((row) => (
              <div key={row.key} className="px-5 py-4" data-e2e="account-sign-in-method-item">
                <IdentityItem
                  icon={<ProviderIcon providerKey={row.providerKey} />}
                  label={row.label}
                  sublabel={row.sublabel}
                  rightContent={
                    <>
                      {row.kind === 'identity' && row.providerKey === 'github' && (
                        <GithubEmailTooltip />
                      )}
                      <LinkButton
                        href={row.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        type="quaternary"
                        theme="outline"
                        size="xs"
                        icon={<Icon icon={ExternalLinkIcon} size={12} />}
                        iconPosition="right">
                        {row.actionLabel}
                      </LinkButton>
                    </>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
