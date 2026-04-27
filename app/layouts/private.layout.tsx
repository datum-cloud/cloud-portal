import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { getRequestContext } from '@/modules/axios/request-context';
import { FathomProvider } from '@/modules/fathom';
import { HelpScoutBeacon } from '@/modules/helpscout';
import { WatchProvider } from '@/modules/watch';
import { AppProvider, useApp } from '@/providers/app.provider';
import { createUserService, ThemeValue, type User } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { env } from '@/utils/env';
import { env as serverEnv } from '@/utils/env/env.server';
import { authMiddleware, fraudStatusMiddleware, withMiddleware } from '@/utils/middlewares';
import { TaskQueueProvider } from '@datum-cloud/datum-ui/task-queue';
import { useTheme } from '@datum-cloud/datum-ui/theme';
import { createHmac } from 'crypto';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { LoaderFunctionArgs, Outlet, data, redirect, useLoaderData } from 'react-router';

export const loader = withMiddleware(
  async ({ request, context }: LoaderFunctionArgs) => {
    try {
      // Use session from load context (already validated by Hono sessionMiddleware)
      // to avoid redundant getSession call
      const session = context?.session ?? (await getSession(request)).session;

      // Re-use the user fetched by fraudStatusMiddleware when available,
      // avoiding a second upstream API call on the same request.
      const cachedUser = getRequestContext()?.cachedUser;
      const user = cachedUser ?? (await createUserService().get(session?.sub ?? ''));

      /**
       * Generate Help Scout signature for secure mode
       */
      let helpscoutSignature = null;
      if (serverEnv.public.helpscoutBeaconId && serverEnv.server.helpscoutSecretKey) {
        helpscoutSignature = createHmac('sha256', serverEnv.server.helpscoutSecretKey ?? '')
          .update(user?.email ?? user?.sub ?? '')
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
  fraudStatusMiddleware
);

function FathomWrapper({ children }: { children: ReactNode }) {
  const { user, orgId, project } = useApp();

  if (!env.public.fathomId || !env.isProd) {
    return <>{children}</>;
  }

  return (
    <FathomProvider
      siteId={env.public.fathomId}
      identity={user?.sub ? { sub: user.sub, orgId, projectId: project?.name } : null}>
      {children}
    </FathomProvider>
  );
}

export default function PrivateLayout() {
  const data: { user: User; helpscoutSignature?: string; ENV: any } =
    useLoaderData<typeof loader>();

  const [helpscoutEnv, setHelpscoutEnv] = useState<{
    beaconId?: string;
    userSignature?: string;
  }>({
    beaconId: undefined,
    userSignature: undefined,
  });

  const { setTheme } = useTheme();

  useEffect(() => {
    if (data?.user) {
      const userTheme = data?.user?.preferences?.theme;
      const nextTheme = userTheme === 'light' ? 'light' : userTheme === 'dark' ? 'dark' : 'system';

      // Set app theme
      setTheme(nextTheme as ThemeValue);
    }

    setHelpscoutEnv({
      beaconId: window.ENV?.helpscoutBeaconId,
      userSignature: data?.helpscoutSignature,
    });
  }, [data]);

  return (
    <WatchProvider>
      <AppProvider initialUser={data?.user}>
        <FathomWrapper>
          <TaskQueueProvider config={{ storageType: 'memory' }}>
            <ConfirmationDialogProvider>
              <Outlet />
            </ConfirmationDialogProvider>

            {helpscoutEnv.beaconId && helpscoutEnv.userSignature && (
              <HelpScoutBeacon
                beaconId={helpscoutEnv.beaconId}
                displayStyle="manual"
                user={{
                  name: `${data?.user?.givenName} ${data?.user?.familyName}`,
                  email: data?.user?.email ?? data?.user?.sub ?? '',
                  signature: helpscoutEnv.userSignature ?? '',
                }}
              />
            )}
          </TaskQueueProvider>
        </FathomWrapper>
      </AppProvider>
    </WatchProvider>
  );
}
