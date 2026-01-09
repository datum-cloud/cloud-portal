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
import { KeyRoundIcon, LockOpenIcon } from 'lucide-react';

const SIGN_IN_METHODS = [
  {
    icon: <Icon icon={LockOpenIcon} className="text-primary size-4" />,
    label: 'Authenticator App (TOTP)',
    sublabel: 'Generate codes using an app like Google Authenticator or Okta Verify.',
    rightContent: (
      <Button type="quaternary" theme="outline" size="xs">
        Add
      </Button>
    ),
  },
  {
    icon: <Icon icon={KeyRoundIcon} className="text-primary size-4" />,
    label: 'Passkeys',
    sublabel:
      'You can use the same passkeys you use for login as a second factor of authentication.',
    rightContent: (
      <Button type="quaternary" theme="outline" size="xs" disabled>
        Added
      </Button>
    ),
  },
  {
    icon: <Icon icon={KeyRoundIcon} className="text-primary size-4" />,
    label: 'Recovery Codes',
    sublabel: 'Security codes when you cannot access any of your other two-factor methods.',
    rightContent: (
      <Button type="quaternary" theme="outline" size="xs">
        Regenerate
      </Button>
    ),
  },
];

export const Account2FACard = () => {
  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="gap-1 border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Two-factor Authentication</CardTitle>
        <CardDescription className="text-1xs">
          Add an additional layer of security by requiring at least two methods of authentication to
          sign in.
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
