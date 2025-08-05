import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { paths } from '@/config/paths';
import { getSession } from '@/modules/cookie/session.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { AppProvider } from '@/providers/app.provider';
import { createUserControl } from '@/resources/control-plane/user.control';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  Outlet,
  data,
  redirect,
  useLoaderData,
} from 'react-router';

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

export default function MainLayout() {
  const user = useLoaderData<typeof loader>();

  return (
    <AppProvider initialUser={user}>
      <ConfirmationDialogProvider>
        <Outlet />
      </ConfirmationDialogProvider>
    </AppProvider>
  );
}
