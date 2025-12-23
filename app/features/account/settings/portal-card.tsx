import { SelectTimezone } from '@/components/select-timezone/select-timezone';
import { useApp } from '@/providers/app.provider';
import { ThemeValue } from '@/resources/interfaces/user.interface';
import { ROUTE_PATH as USER_PREFERENCES_UPDATE_ACTION } from '@/routes/api/user/preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { Label } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { Separator } from '@shadcn/ui/separator';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { Theme, useTheme } from 'remix-themes';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

const THEME_OPTIONS: readonly { readonly value: ThemeValue; readonly label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
] as const;

const SkeletonPreview = ({ variant }: { variant: 'dark' | 'light' }) => {
  const bar100 = variant === 'dark' ? 'bg-slate-700' : 'bg-slate-300';
  const bar75 = variant === 'dark' ? 'bg-slate-600' : 'bg-slate-200';
  const bar85 = variant === 'dark' ? 'bg-slate-700' : 'bg-slate-300';
  return (
    <div className="flex h-full flex-col justify-between p-2">
      <div className="space-y-1">
        <div className={`h-1 w-full rounded ${bar100}`}></div>
        <div className={`h-1 w-3/4 rounded ${bar75}`}></div>
        <div className={`h-1 w-5/6 rounded ${bar85}`}></div>
      </div>
      <div className="space-y-1">
        <div className={`h-1 w-2/3 rounded ${bar75}`}></div>
        <div className={`h-1 w-4/5 rounded ${bar100}`}></div>
        <div className={`h-1 w-1/2 rounded ${bar75}`}></div>
      </div>
      <div className="space-y-1">
        <div className={`h-1 w-full rounded ${bar100}`}></div>
        <div className={`h-1 w-2/3 rounded ${bar75}`}></div>
      </div>
    </div>
  );
};

const ThemePreview = ({
  value,
  selected,
  onSelect,
}: {
  value: ThemeValue;
  selected: boolean;
  onSelect: (value: ThemeValue) => void;
}) => {
  const containerClass = cn(
    'data-[selected=true]:border-primary data-[selected=true]:shadow-lg data-[selected=true]:shadow-primary/20 data-[selected=true]:ring-2 data-[selected=true]:ring-primary/10',
    'aspect-video rounded border transition-all',
    value !== 'system' && (value === 'dark' ? 'bg-slate-900' : 'bg-white'),
    value === 'system' && 'relative overflow-hidden'
  );
  return (
    <div className="relative" data-testid={`theme-${value}`}>
      <div className={containerClass} data-selected={selected}>
        {value === 'system' ? (
          <>
            <div
              className="absolute inset-0 bg-slate-900"
              style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}>
              <SkeletonPreview variant="dark" />
            </div>
            <div
              className="absolute inset-0 bg-white"
              style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>
              <SkeletonPreview variant="light" />
            </div>
          </>
        ) : (
          <SkeletonPreview variant={value} />
        )}

        {selected && (
          <div className="bg-secondary text-secondary-foreground absolute top-2 right-2 rounded-full border p-1">
            <Icon icon={Check} className="size-3" />
          </div>
        )}
      </div>
      <input
        type="radio"
        name="theme"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </div>
  );
};

/** Portal preferences: timezone and theme mode */
export const AccountPortalSettingsCard = () => {
  const { userPreferences, setUser } = useApp();
  const [theme, setTheme] = useTheme();
  const fetcher = useFetcher({ key: 'portal-preferences' });
  const csrf = useAuthenticityToken();

  const [currentTheme, setCurrentTheme] = useState<ThemeValue>(theme as ThemeValue);
  const [timezone, setTimezone] = useState<string>();

  const updatePreferences = (payload: { theme?: ThemeValue; timezone?: string }) => {
    fetcher.submit(
      {
        ...payload,
        csrf,
      },
      {
        method: 'PATCH',
        encType: 'application/json',
        action: USER_PREFERENCES_UPDATE_ACTION,
      }
    );
  };

  const updateTheme = (theme: ThemeValue) => {
    setTheme(theme === 'system' ? null : (theme as Theme));
    setCurrentTheme(theme);

    updatePreferences({ theme });
  };

  const updateTimezone = (timezone: string) => {
    setTimezone(timezone);

    updatePreferences({ timezone });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data?.success) {
        setUser(fetcher?.data?.data);
      }
    }
  }, [fetcher.data, fetcher.state]);

  useEffect(() => {
    if (userPreferences) {
      setCurrentTheme(userPreferences.theme);
      setTimezone(userPreferences.timezone);
    }
  }, [userPreferences]);

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Portal Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="w-96 space-y-2">
          <Label className="text-sm leading-5 font-medium">Timezone</Label>
          <SelectTimezone
            selectedValue={timezone}
            onValueChange={(option) => updateTimezone(option.tzCode)}
            placeholder="Choose your timezone..."
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <Label className="text-sm leading-5 font-medium">Theme mode</Label>
            <p className="text-muted-foreground text-xs">
              Choose how the portal looks to you. Select a single theme, or sync with your system.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {THEME_OPTIONS.map((opt) => (
              <div key={opt.value} className="space-y-2">
                <ThemePreview
                  value={opt.value}
                  selected={currentTheme === opt.value}
                  onSelect={updateTheme}
                />
                <Label className="text-sm">{opt.label}</Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
