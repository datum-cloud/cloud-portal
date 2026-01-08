import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { useTheme } from '@/modules/datum-themes';
import { HelpScoutBeacon } from '@/modules/helpscout';
import { WatchProvider } from '@/modules/watch';
import { AppProvider } from '@/providers/app.provider';
import { createUserService, ThemeValue, type User } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { env } from '@/utils/env/env.server';
import {
  authMiddleware,
  registrationApprovalMiddleware,
  withMiddleware,
} from '@/utils/middlewares';
import { TooltipProvider } from '@shadcn/ui/tooltip';
import { createHmac } from 'crypto';
import { useEffect, useState } from 'react';
import { LoaderFunctionArgs, Outlet, data, redirect, useLoaderData } from 'react-router';

export const loader = withMiddleware(
  async ({ request }: LoaderFunctionArgs) => {
    try {
      // Services now use global axios client with AsyncLocalStorage
      const { session } = await getSession(request);
      const userService = createUserService();
      const user = await userService.get(session?.sub ?? '');

      /**
       * Generate Help Scout signature for secure mode
       */
      let helpscoutSignature = null;
      if (env.isProd && env.public.helpscoutBeaconId && user?.email) {
        helpscoutSignature = createHmac('sha256', env.server.helpscoutSecretKey ?? '')
          .update(user?.email)
          .digest('hex');
      }

      return data({
        user,
        helpscoutSignature,
      });
    } catch {
      return redirect(paths.auth.logOut);
    }
  },
  authMiddleware,
  registrationApprovalMiddleware
);

export default function PrivateLayout() {
  const data: { user: User; helpscoutSignature: string | null; ENV: any } =
    useLoaderData<typeof loader>();

  const [helpscoutEnv, setHelpscoutEnv] = useState<{
    HELPSCOUT_BEACON_ID: string;
    isProd: boolean;
    userSignature: string;
  }>({
    HELPSCOUT_BEACON_ID: '',
    isProd: false,
    userSignature: '',
  });

  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (data?.user) {
      const userTheme = data?.user?.preferences?.theme;
      const nextTheme = userTheme === 'light' ? 'light' : userTheme === 'dark' ? 'dark' : 'system';

      // Set app theme
      setTheme(nextTheme as ThemeValue);
    }

    setHelpscoutEnv({
      HELPSCOUT_BEACON_ID: window.ENV?.helpscoutBeaconId ?? '',
      isProd: window.ENV?.nodeEnv === 'production',
      userSignature: data?.helpscoutSignature ?? '',
    });
  }, [data]);

  return (
    <WatchProvider>
      <AppProvider initialUser={data?.user}>
        <TooltipProvider>
          <ConfirmationDialogProvider>
            <Outlet />
          </ConfirmationDialogProvider>
        </TooltipProvider>

        {helpscoutEnv.HELPSCOUT_BEACON_ID && helpscoutEnv.isProd && (
          <HelpScoutBeacon
            beaconId={helpscoutEnv.HELPSCOUT_BEACON_ID}
            user={{
              name: `${data?.user?.givenName} ${data?.user?.familyName}`,
              email: data?.user?.email,
              signature: helpscoutEnv.userSignature ?? '',
            }}
          />
        )}
      </AppProvider>
    </WatchProvider>
  );
}
