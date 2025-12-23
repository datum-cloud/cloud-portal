import { useApp } from '@/providers/app.provider';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { MailIcon } from 'lucide-react';

export const AccountIdentitySettingsCard = () => {
  const { user } = useApp();

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Account Identity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Icon icon={MailIcon} className="size-5" />
            <div>
              <div className="text-sm leading-5 font-semibold">Email address</div>
              <div className="text-muted-foreground text-sm">{user?.email}</div>
            </div>
          </div>
          {/* <Badge variant="butter">Connected</Badge> */}
        </div>
      </CardContent>
    </Card>
  );
};
