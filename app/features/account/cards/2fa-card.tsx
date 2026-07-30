import { IdentityItem } from '@/features/account/identity-item';
import { IdentityItemSkeleton } from '@/features/account/identity-item-skeleton';
import {
  buildPasskeysHref,
  buildSecurityReturnTo,
  countActivePasskeys,
} from '@/features/account/sign-in-methods';
import { useApp } from '@/providers/app.provider';
import { usePasskeys } from '@/resources/users';
import { env } from '@/utils/env';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ExternalLinkIcon, KeyRoundIcon, LockOpenIcon } from 'lucide-react';

/**
 * Rows whose state the portal cannot read. There is no API exposing enrolled
 * auth methods (`totp`, `u2f`, `otp_sms`, …) — that union lives only inside
 * auth-ui's Zitadel adapter — and recovery codes do not exist platform-wide
 * (roadmap C1). Rendering them disabled is deliberate: the design calls for the
 * rows, and a "Coming Soon" label is honest where a live-looking button is not.
 */
const ComingSoonAction = () => (
  <Button
    htmlType="button"
    type="quaternary"
    theme="outline"
    size="xs"
    disabled
    className="text-xs font-normal">
    Coming Soon
  </Button>
);

export const Account2FACard = () => {
  const { user } = useApp();
  const { data: passkeys, isLoading, isError } = usePasskeys(user?.sub ?? 'me');

  // Active only — an inactive passkey is a dead credential, not a second factor.
  const hasPasskey = countActivePasskeys(passkeys ?? []) > 0;
  const passkeysHref = buildPasskeysHref(
    env.public.authUiOrigin,
    buildSecurityReturnTo(env.public.appUrl)
  );

  return (
    <Card data-e2e="account-2fa-card" className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="gap-1 border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Two-factor Authentication</CardTitle>
        <CardDescription className="text-1xs">
          Add an additional layer of security by requiring at least two methods of authentication to
          sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-stepper-line flex flex-col divide-y">
          <div className="px-5 py-4">
            <IdentityItem
              icon={<Icon icon={LockOpenIcon} className="text-primary size-4" />}
              label="Authenticator App (TOTP)"
              sublabel="Generate codes using an app like Google Authenticator or Okta Verify."
              rightContent={<ComingSoonAction />}
            />
          </div>

          <div className="px-5 py-4">
            {isLoading ? (
              <IdentityItemSkeleton count={1} showActions className="px-0 py-0" />
            ) : (
              <IdentityItem
                icon={<Icon icon={KeyRoundIcon} className="text-primary size-4" />}
                label="Passkeys"
                sublabel="You can use the same passkeys you use for login as a second factor of authentication."
                rightContent={
                  isError ? null : hasPasskey ? (
                    <Button
                      htmlType="button"
                      type="quaternary"
                      theme="outline"
                      size="xs"
                      disabled
                      className="text-xs font-normal">
                      Added
                    </Button>
                  ) : (
                    <LinkButton
                      href={passkeysHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      type="quaternary"
                      theme="outline"
                      size="xs"
                      icon={<Icon icon={ExternalLinkIcon} size={12} />}
                      iconPosition="right">
                      Add
                    </LinkButton>
                  )
                }
              />
            )}
          </div>

          <div className="px-5 py-4">
            <IdentityItem
              icon={<Icon icon={KeyRoundIcon} className="text-primary size-4" />}
              label="Recovery Codes"
              sublabel="Security codes when you cannot access any of your other two-factor methods."
              rightContent={<ComingSoonAction />}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
