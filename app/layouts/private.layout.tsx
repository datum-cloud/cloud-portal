import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from '@/modules/cookie/session.server';
import { helpScoutAPI } from '@/modules/helpscout';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { AppProvider } from '@/providers/app.provider';
import { createUserControl } from '@/resources/control-plane/user.control';
import { IUser } from '@/resources/interfaces/user.interface';
import { getSharedEnvs } from '@/utils/config/env.config';
import { paths } from '@/utils/config/paths.config';
import { createHmac } from 'crypto';
import { useEffect } from 'react';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  Outlet,
  data,
  redirect,
  useLoaderData,
} from 'react-router';
import { Theme, useTheme } from 'remix-themes';

export const loader = withMiddleware(async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const { session } = await getSession(request);
    const sharedEnv = getSharedEnvs();

    if (!session || !session?.sub) {
      return redirect(paths.auth.logOut);
    }

    const userControl = createUserControl(controlPlaneClient);
    const user = await userControl.detail(session?.sub);

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

    return data({ ...user, helpscoutSignature });
  } catch {
    return redirect(paths.auth.logOut);
  }
}, authMiddleware);

export default function PrivateLayout() {
  const user: IUser & { helpscoutSignature: string | null } = useLoaderData<typeof loader>();

  const [_, setTheme] = useTheme();

  useEffect(() => {
    if (user) {
      const userTheme = user?.preferences?.theme;
      const nextTheme =
        userTheme === 'light' ? Theme.LIGHT : userTheme === 'dark' ? Theme.DARK : null;
      setTheme(nextTheme);

      if (user.helpscoutSignature) {
        helpScoutAPI.identify({
          name: `${user.givenName} ${user.familyName}`,
          email: user.email,
          signature: user.helpscoutSignature,
        });
      }
    }
  }, [user]);

  return (
    <TooltipProvider>
      <ConfirmationDialogProvider>
        <AppProvider initialUser={user}>
          <Outlet />
        </AppProvider>
      </ConfirmationDialogProvider>
    </TooltipProvider>
  );
}
