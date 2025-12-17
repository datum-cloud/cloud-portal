import GitHubIcon from '@/components/icon/github';
import GoogleIcon from '@/components/icon/google';
import { useApp } from '@/providers/app.provider';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { type ComponentType, type SVGProps } from 'react';

const PROVIDERS: Record<string, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  google: { label: 'Google', Icon: GoogleIcon },
  github: { label: 'GitHub', Icon: GitHubIcon },
};

export const AccountLoginProviderCard = () => {
  const { user } = useApp();

  const provider = user?.lastLoginProvider;
  const providerMeta = provider ? PROVIDERS[provider] : undefined;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Authentication</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            {providerMeta ? (
              <providerMeta.Icon className="size-5" />
            ) : (
              <span className="text-muted-foreground inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold">
                ?
              </span>
            )}
            <div>
              <div className="text-sm leading-5 font-semibold">Identity provider</div>
              <div className="text-muted-foreground text-sm">
                {providerMeta ? (
                  <div className="text-muted-foreground text-sm">{providerMeta.label}</div>
                ) : (
                  'Not available'
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
