import { useApp } from '@/providers/app.provider';
import { ROUTE_PATH as USER_PREFERENCES_UPDATE_ACTION } from '@/routes/api/user/preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@shadcn/ui/card';
import { Label } from '@shadcn/ui/label';
import { Switch } from '@shadcn/ui/switch';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

export const AccountNewsletterSettingsCard = () => {
  const { userPreferences } = useApp();
  const fetcher = useFetcher();
  const csrf = useAuthenticityToken();
  const [emailNewsletter, setEmailNewsletter] = useState(false);

  useEffect(() => {
    if (userPreferences) {
      setEmailNewsletter(userPreferences.newsletter);
    }
  }, [userPreferences]);

  const updatePreferences = (value: boolean) => {
    setEmailNewsletter(value);
    fetcher.submit(
      {
        newsletter: value,
        csrf,
      },
      {
        method: 'PATCH',
        encType: 'application/json',
        action: USER_PREFERENCES_UPDATE_ACTION,
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm leading-5 font-medium">Newsletter</Label>
            <p className="text-muted-foreground text-sm">
              Receive updates about new features and product announcements
            </p>
          </div>
          <Switch checked={emailNewsletter} onCheckedChange={updatePreferences} />
        </div>
      </CardContent>
    </Card>
  );
};
