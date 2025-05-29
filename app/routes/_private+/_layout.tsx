import { routes } from '@/constants/routes';
import { zitadelIssuer } from '@/modules/auth/strategies/zitadel.server';
import { createAxiosClient } from '@/modules/axios/axios';
import { getSession } from '@/modules/cookie/session.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { AppProvider } from '@/providers/app.provider';
import { ConfirmationDialogProvider } from '@/providers/confirmationDialog.provider';
import { IUser } from '@/resources/interfaces/user.interface';
import { LoaderFunctionArgs, Outlet, data, redirect, useLoaderData } from 'react-router';

export const loader = withMiddleware(async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await getSession(request);

    if (!session) {
      return redirect(routes.auth.logOut);
    }

    // Get user info from Zitadel
    const apiClient = createAxiosClient({
      baseURL: zitadelIssuer,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const user = await apiClient.get<IUser>('/oidc/v1/userinfo');

    return data(user.data);
  } catch {
    return redirect(routes.auth.logOut);
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
