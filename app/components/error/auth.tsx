import { LogoIcon } from '@/components/logo/logo-icon';
import { paths } from '@/utils/config/paths.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
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
          <Text as="p" size="2xl" weight="bold" className="w-full text-center">
            Your session has expired
          </Text>

          <Text
            as="div"
            textColor="muted"
            className="flex items-center justify-center gap-2 text-center">
            <SpinnerIcon size="xs" aria-hidden="true" />
            Logging out...
          </Text>
        </div>
      </CardContent>
    </Card>
  );
};
