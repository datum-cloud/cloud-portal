import GitHubIcon from '@/components/icon/github';
import GoogleIcon from '@/components/icon/google';
import { useApp } from '@/providers/app.provider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LinkButton,
  Tooltip,
} from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { CircleAlertIcon, ExternalLinkIcon, MailIcon } from 'lucide-react';
import { ComponentType, SVGProps } from 'react';

const PROVIDERS: Record<string, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  google: { label: 'Google', Icon: GoogleIcon },
  github: { label: 'GitHub', Icon: GitHubIcon },
};

export const AccountIdentitySettingsCard = () => {
  const { user } = useApp();

  console.log(user);

  const provider = user?.lastLoginProvider;
  const providerMeta = provider ? PROVIDERS[provider] : undefined;

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Account Identities</CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center space-x-3.5">
            {providerMeta ? (
              <div className="bg-badge-muted dark:bg-background flex size-[34px] items-center justify-center rounded-xl">
                <providerMeta.Icon className="size-3.5" />
              </div>
            ) : (
              <div className="bg-badge-muted flex size-[34px] items-center justify-center rounded-xl">
                <Icon icon={MailIcon} className="size-3.5" />
              </div>
            )}

            <div className="flex flex-col space-y-0.5 text-left text-xs">
              <span className="font-medium">{providerMeta?.label ?? 'Email address'}</span>
              <span className="text-foreground/80">{user?.email}</span>
            </div>
          </div>

          {/* TODO: Enable this when we have a way to get the last used date */}
          {/* <span className="text-foreground/80 text-center text-xs">Last used Jun 4</span> */}

          <div className="flex items-center justify-end gap-10">
            {provider === 'github' && (
              <Tooltip
                message={
                  <div className="flex flex-col gap-3.5 p-7">
                    <h4 className="text-foreground text-sm font-semibold">
                      Updating email addresses for GitHub identities
                    </h4>
                    <p className="text-foreground/80 text-xs text-wrap">
                      Email addresses for GitHub identities should be updated through GitHub
                    </p>
                    <ul className="text-foreground/80 list-outside list-decimal space-y-3.5 pl-4 text-xs text-wrap">
                      <li>Log out of Datum</li>
                      <li>Change your Primary Email in GitHub (your primary email)</li>
                      <li>Log out of GitHub</li>
                      <li>Log back into GitHub (with the new, desired email set as primary)</li>
                      <li>Log back into Datum</li>
                    </ul>
                  </div>
                }
                contentClassName="bg-card rounded-xl shadow-tooltip text-foreground max-w-[380px] border p-0"
                arrowClassName="fill-card">
                <div className="pointer flex cursor-pointer items-center gap-2.5">
                  <Icon icon={CircleAlertIcon} size={12} className="text-primary" />
                  <span className="text-primary text-xs underline">
                    How to update your GitHub email
                  </span>
                </div>
              </Tooltip>
            )}
            <LinkButton
              to="https://auth.datum.net/ui/v2/login/idp/link"
              target="_blank"
              rel="noopener noreferrer"
              type="quaternary"
              theme="outline"
              size="xs"
              icon={<Icon icon={ExternalLinkIcon} size={12} />}
              iconPosition="right">
              Manage
            </LinkButton>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
