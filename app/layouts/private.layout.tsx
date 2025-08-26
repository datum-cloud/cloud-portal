import { paths } from '@/config/paths';
import { getSession } from '@/modules/cookie/session.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { AppProvider } from '@/providers/app.provider';
import { createUserControl } from '@/resources/control-plane/user.control';
import { IUser } from '@/resources/interfaces/user.interface';
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

  useEffect(() => {
    if (user) {
      const userTheme = user?.preferences?.theme;
      const nextTheme =
        userTheme === 'light' ? Theme.LIGHT : userTheme === 'dark' ? Theme.DARK : null;
      setTheme(nextTheme);
    }
  }, [user]);

  return (
    <AppProvider initialUser={user}>
      <Outlet />
    </AppProvider>
  );
}
