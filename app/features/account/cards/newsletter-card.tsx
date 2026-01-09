import { useApp } from '@/providers/app.provider';
import { useUpdateUserPreferences } from '@/resources/users';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { Label } from '@datum-ui/components';
import { Switch } from '@datum-ui/components';
import { useEffect, useState } from 'react';

export const AccountNewsletterSettingsCard = () => {
  const { user, userPreferences } = useApp();
  const userId = user?.sub ?? 'me';
  const [emailNewsletter, setEmailNewsletter] = useState(false);

  const updatePreferencesMutation = useUpdateUserPreferences(userId);

  useEffect(() => {
    if (userPreferences) {
      setEmailNewsletter(userPreferences.newsletter);
    }
  }, [userPreferences]);

  const updatePreferences = (value: boolean) => {
    setEmailNewsletter(value);
    updatePreferencesMutation.mutate({ newsletter: value });
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
