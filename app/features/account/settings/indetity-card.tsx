import GoogleIcon from '@/components/icon/google';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/providers/app.provider';

export const AccountIdentitySettingsCard = () => {
  const { user } = useApp();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Identity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <GoogleIcon className="size-5" />
            <div>
              <div className="text-sm leading-5 font-semibold">Google</div>
              <div className="text-muted-foreground text-sm">{user?.email}</div>
            </div>
          </div>
          <Badge variant="butter">Connected</Badge>
        </div>
      </CardContent>
    </Card>
  );
};
