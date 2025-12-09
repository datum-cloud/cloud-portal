import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { NotificationProvider } from '@/components/notification';
import { HelpScoutBeacon } from '@/modules/helpscout';
import { AppProvider } from '@/providers/app.provider';
import { createUserControl } from '@/resources/control-plane';
import { IUser } from '@/resources/interfaces/user.interface';
import { getSharedEnvs } from '@/utils/config/env.config';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import {
  authMiddleware,
  registrationApprovalMiddleware,
  withMiddleware,
} from '@/utils/middlewares';
import { TooltipProvider } from '@shadcn/ui/tooltip';
import { createHmac } from 'crypto';
import { useEffect, useState } from 'react';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  Outlet,
  data,
  redirect,
  useLoaderData,
} from 'react-router';
import { Theme, useTheme } from 'remix-themes';

export const loader = withMiddleware(
  async ({ request, context }: LoaderFunctionArgs) => {
    try {
      const { controlPlaneClient } = context as AppLoadContext;
      const { session } = await getSession(request);
      const sharedEnv = getSharedEnvs();

      const userControl = createUserControl(controlPlaneClient);
      const user = await userControl.detail(session?.sub ?? '');

      /**
       * Generate Help Scout signature for secure mode
       */
      let helpscoutSignature = null;
      if (
        sharedEnv.isProd &&
        sharedEnv.HELPSCOUT_SECRET_KEY &&
        sharedEnv.HELPSCOUT_BEACON_ID &&
        user?.email
      ) {
        helpscoutSignature = createHmac('sha256', sharedEnv.HELPSCOUT_SECRET_KEY)
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
  const data: { user: IUser; helpscoutSignature: string | null; ENV: any } =
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

  const [_, setTheme] = useTheme();

  useEffect(() => {
    if (data?.user) {
      const userTheme = data?.user?.preferences?.theme;
      const nextTheme =
        userTheme === 'light' ? Theme.LIGHT : userTheme === 'dark' ? Theme.DARK : null;

      // Set app theme
      setTheme(nextTheme);
    }

    setHelpscoutEnv({
      HELPSCOUT_BEACON_ID: window.ENV.HELPSCOUT_BEACON_ID,
      isProd: window.ENV.isProd,
      userSignature: data?.helpscoutSignature ?? '',
    });
  }, [data]);

  return (
    <AppProvider initialUser={data?.user}>
      <TooltipProvider>
        <ConfirmationDialogProvider>
          <NotificationProvider options={{ interval: 5 * 60 * 1000 }}>
            <Outlet />
          </NotificationProvider>
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
  );
}
