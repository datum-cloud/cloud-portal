import { GitHubLineIcon } from '@/components/icon/github-line';
import GoogleIcon from '@/components/icon/google';
import { IdentityItem } from '@/features/account/identity-item';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { EllipsisIcon, KeyRoundIcon, MailIcon } from 'lucide-react';

const SIGN_IN_METHODS = [
  {
    icon: <GoogleIcon className="size-3.5" />,
    label: 'Google',
    sublabel: 'cberridge@datum.net',
    rightContent: (
      <div className="flex items-center gap-3.5">
        <span className="text-icon-primary/80 text-1xs">Last used today</span>
        <Button type="quaternary" theme="outline" size="icon" className="size-6">
          <Icon icon={EllipsisIcon} size={14} />
        </Button>
      </div>
    ),
  },
  {
    icon: <Icon icon={MailIcon} className="text-primary size-4" />,
    label: 'Email',
    sublabel: 'cberridge@datum.net',
    rightContent: (
      <Button type="quaternary" theme="outline" size="xs">
        Manage
      </Button>
    ),
  },
  {
    icon: <Icon icon={KeyRoundIcon} className="text-primary size-4" />,
    label: 'Passkeys',
    sublabel: '1 passkey registered',
    rightContent: (
      <Button type="quaternary" theme="outline" size="xs">
        Add
      </Button>
    ),
  },
  {
    icon: <GitHubLineIcon className="size-4" />,
    label: 'GitHub',
    sublabel: 'Connect your GitHub account',
    rightContent: (
      <Button type="primary" size="xs">
        Connect
      </Button>
    ),
  },
];

export const AccountSignInMethodSettingsCard = () => {
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="gap-1 border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Sign-in Methods</CardTitle>
        <CardDescription className="text-1xs">
          Customize how you access your account. Link your Git profiles and set up passkeys for
          seamless, secure authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-stepper-line flex flex-col divide-y">
          {SIGN_IN_METHODS.map((method) => (
            <div key={method.label} className="px-5 py-4">
              <IdentityItem
                icon={method.icon}
                label={method.label}
                sublabel={method.sublabel}
                rightContent={method.rightContent}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
