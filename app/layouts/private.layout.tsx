import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { paths } from '@/config/paths';
import { getSession } from '@/modules/cookie/session.server';
import { FathomAnalytics } from '@/modules/fathom/fathom';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { AppProvider } from '@/providers/app.provider';
import { createUserControl } from '@/resources/control-plane/user.control';
import { IUser } from '@/resources/interfaces/user.interface';
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

export const loader = withMiddleware(async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const { session } = await getSession(request);

    if (!session || !session?.sub) {
      return redirect(paths.auth.logOut);
    }

    const userControl = createUserControl(controlPlaneClient);
    const user = await userControl.detail(session?.sub);

    return data(user);
  } catch {
    return redirect(paths.auth.logOut);
  }
}, authMiddleware);

export default function PrivateLayout() {
  const user: IUser = useLoaderData<typeof loader>();

  const [_, setTheme] = useTheme();
  const [fathomKey, setFathomKey] = useState<string>();

  useEffect(() => {
    if (user) {
      const userTheme = user?.preferences?.theme;
      const nextTheme =
        userTheme === 'light' ? Theme.LIGHT : userTheme === 'dark' ? Theme.DARK : null;
      setTheme(nextTheme);
    }
  }, [user]);

  useEffect(() => {
    if (window.ENV.FATHOM_ID && window.ENV.PROD) {
      setFathomKey(window.ENV.FATHOM_ID);
    }
  }, []);

  return (
    <TooltipProvider>
      <ConfirmationDialogProvider>
        {fathomKey && <FathomAnalytics privateKey={fathomKey} />}
        <AppProvider initialUser={user}>
          <Outlet />
        </AppProvider>
      </ConfirmationDialogProvider>
    </TooltipProvider>
  );
}
