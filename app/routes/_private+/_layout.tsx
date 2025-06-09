import { routes } from '@/constants/routes';
import { apiRequest } from '@/modules/axios/axios';
import { AppProvider } from '@/providers/app.provider';
import { ConfirmationDialogProvider } from '@/providers/confirmationDialog.provider';
import { IUser } from '@/resources/interfaces/user.interface';
import { env } from '@/utils/config/env.server';
import { sessionCookie } from '@/utils/cookies/session';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
import { LoaderFunctionArgs, Outlet, data, redirect, useLoaderData } from 'react-router';

export const loader = withMiddleware(async ({ request }: LoaderFunctionArgs) => {
  try {
    const { data: session } = await sessionCookie.get(request);

    if (!session) {
      return redirect(routes.auth.logOut);
    }

    // Get user info from Zitadel
    const apiClient = apiRequest({
      baseURL: env.AUTH_OIDC_ISSUER,
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
