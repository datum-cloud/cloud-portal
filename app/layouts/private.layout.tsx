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
import { Suspense, useEffect } from 'react';
import { Await, LoaderFunctionArgs, Outlet, data, redirect, useLoaderData } from 'react-router';

/** Skip re-running this layout's loader on Link navigations within the
 * authenticated app. The user object loaded here rarely changes during
 * a session. Form submissions (logout, profile updates, etc.) and
 * explicit revalidation calls still trigger a re-fetch.
 *
 * Mirrors the pattern in app/root.tsx. */
export function shouldRevalidate({
  formData,
  defaultShouldRevalidate,
}: {
  formData?: FormData;
  defaultShouldRevalidate: boolean;
}) {
  // Form submissions (logout, profile edits, etc.) — revalidate to get fresh user data
  if (formData) return defaultShouldRevalidate;

  // Link navigation — skip; user data doesn't change between routes
  return false;
}

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

      // Compute HelpScout HMAC asynchronously — returns a promise that streams to
      // the client instead of blocking the layout shell render. HelpScout is a
      // non-critical support-chat widget; it can mount after first paint.
      const helpscoutSignaturePromise: Promise<string | null> =
        serverEnv.public.helpscoutBeaconId && serverEnv.server.helpscoutSecretKey
          ? Promise.resolve(
              createHmac('sha256', serverEnv.server.helpscoutSecretKey ?? '')
                .update(user?.email ?? user?.sub ?? '')
                .digest('hex')
            )
          : Promise.resolve(null);

      return data({
        user,
        helpscoutSignature: helpscoutSignaturePromise,
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
  const data: { user: User; helpscoutSignature: Promise<string | null> } =
    useLoaderData<typeof loader>();

  const { setTheme } = useTheme();

  useEffect(() => {
    if (data?.user) {
      const userTheme = data?.user?.preferences?.theme;
      const nextTheme = userTheme === 'light' ? 'light' : userTheme === 'dark' ? 'dark' : 'system';

      // Set app theme
      setTheme(nextTheme as ThemeValue);
    }
  }, [data?.user]);

  return (
    <WatchProvider>
      <AppProvider initialUser={data?.user}>
        <FathomWrapper>
          <TaskQueueProvider config={{ storageType: 'memory' }}>
            <ConfirmationDialogProvider>
              <Outlet />
            </ConfirmationDialogProvider>

            {/* HelpScout is non-critical — mount asynchronously after the deferred
                HMAC promise resolves so it never blocks the layout shell render. */}
            <Suspense fallback={null}>
              <Await resolve={data?.helpscoutSignature} errorElement={null}>
                {(helpscoutSignature) =>
                  helpscoutSignature && window.ENV?.helpscoutBeaconId ? (
                    <HelpScoutBeacon
                      beaconId={window.ENV.helpscoutBeaconId}
                      displayStyle="manual"
                      user={{
                        name: `${data?.user?.givenName} ${data?.user?.familyName}`,
                        email: data?.user?.email ?? data?.user?.sub ?? '',
                        signature: helpscoutSignature,
                      }}
                    />
                  ) : null
                }
              </Await>
            </Suspense>
          </TaskQueueProvider>
        </FathomWrapper>
      </AppProvider>
    </WatchProvider>
  );
}
