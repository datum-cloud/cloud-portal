import { IdentityItem } from '../identity-item';
import { IdentityItemSkeleton } from '../identity-item-skeleton';
import { GithubEmailTooltip, ProviderIcon } from '@/features/account/identity-providers';
import { buildSsoHref, providerKeyOf, providerLabel } from '@/features/account/sign-in-methods';
import { useApp } from '@/providers/app.provider';
import { useUserIdentities } from '@/resources/users';
import { env } from '@/utils/env';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ExternalLinkIcon } from 'lucide-react';

export const AccountIdentitySettingsCard = () => {
  const { user } = useApp();
  const { data: identities, isLoading: isLoadingIdentities } = useUserIdentities(user?.sub ?? 'me');

  return (
    <Card data-e2e="account-identities-card" className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Account Identities</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoadingIdentities ? (
          <IdentityItemSkeleton count={1} showActions />
        ) : (
          <div className="divide-stepper-line flex flex-col divide-y">
            {identities?.map((identity) => {
              // Shared derivation: this card and the Security tab's render the
              // same identities, and previously disagreed on both the key and
              // the label fallback for an unrecognised provider.
              const provider = providerKeyOf(identity);
              return (
                <div key={identity.name} data-e2e="account-identity-item">
                  <IdentityItem
                    className="px-5 py-4"
                    icon={<ProviderIcon providerKey={provider} />}
                    label={providerLabel(identity)}
                    sublabel={identity.username}
                    middleContent={
                      // TODO: Enable this when we have a way to get the last used date
                      // <span className="text-foreground/80 text-center text-xs">Last used Jun 4</span>
                      undefined
                    }
                    rightContent={
                      <>
                        {provider === 'github' && <GithubEmailTooltip />}
                        <LinkButton
                          // auth-ui's Linked accounts screen. The old
                          // /ui/v2/login/idp/link is Zitadel-era and survives
                          // only as a 301 to /id/sso/link — this targets the
                          // canonical path directly, and matches what the
                          // Security tab's Sign-in Methods card links to.
                          href={buildSsoHref(env.public.authUiOrigin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          type="quaternary"
                          theme="outline"
                          size="xs"
                          icon={<Icon icon={ExternalLinkIcon} size={12} />}
                          iconPosition="right">
                          Manage
                        </LinkButton>
                      </>
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
