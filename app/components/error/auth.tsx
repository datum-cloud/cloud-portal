import { LogoIcon } from '@/components/logo/logo-icon';
import { paths } from '@/utils/config/paths.config';
import { Card, CardContent, SpinnerIcon } from '@datum-ui/components';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export const AuthError = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(paths.auth.logOut, { replace: true });
  }, [navigate]);

  return (
    <Card>
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />
        <div className="flex max-w-xl flex-col gap-2">
          <p className="w-full text-center text-2xl font-bold">Your session has expired</p>

          <div className="text-muted-foreground flex items-center justify-center gap-2 text-center text-sm">
            <SpinnerIcon size="xs" aria-hidden="true" />
            Logging out...
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
