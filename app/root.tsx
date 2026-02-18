import { AuthError } from '@/components/error/auth';
import { GenericError } from '@/components/error/generic';
import { ClientHintCheck } from '@/components/misc/client-hints';
import { DynamicFaviconLinks } from '@/components/misc/dynamic-favicon';
import { useNonce } from '@/hooks/useNonce';
import { ThemeProvider, ThemeScript, useTheme } from '@/modules/datum-themes';
import { FathomAnalytics } from '@/modules/fathom/fathom';
import MarkerIoEmbed from '@/modules/markerio';
import { queryClient } from '@/modules/tanstack/query';
// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import RootCSS from '@/styles/root.css?url';
import { csrf, getToastSession } from '@/utils/cookies';
import { env } from '@/utils/env/env.server';
import { metaObject } from '@/utils/helpers/meta.helper';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { Toaster, useToast } from '@datum-ui/components';
import { configureProgress, startProgress, stopProgress } from '@datum-ui/components/nprogress';
import * as Sentry from '@sentry/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import React, { useEffect, useMemo } from 'react';
import {
  Links,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  isRouteErrorResponse,
  useFetchers,
  useLoaderData,
  useNavigation,
  useRouteError,
} from 'react-router';
import type { LinksFunction, LoaderFunctionArgs } from 'react-router';
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react';

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  // Get the current page title from the pathname
  const getPageTitle = () => {
    const path = location.pathname;
    // Remove leading slash and convert to title case
    if (path === '/') return 'Home';

    const pageName = path.split('/').pop() || '';
    return pageName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const pageTitle = getPageTitle();

  return metaObject(data ? pageTitle : 'Error');
};

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: RootCSS }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { toast, headers: toastHeaders } = await getToastSession(request);
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request);

  return data(
    {
      toast,
      csrfToken,
      ENV: env.public,
    } as const,
    {
      headers: combineHeaders(
        toastHeaders,
        csrfCookieHeader ? { 'Set-Cookie': csrfCookieHeader } : null
      ),
    }
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" attribute="class">
      {children}
    </ThemeProvider>
  );
}

function Document({ children, nonce }: { children: React.ReactNode; nonce: string }) {
  const data = useLoaderData<typeof loader>();

  const { resolvedTheme } = useTheme();

  return (
    <html
      lang="en"
      className="theme-alpha bg-background overflow-x-hidden overscroll-none"
      suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <DynamicFaviconLinks />

        <ClientHintCheck nonce={nonce} />
        <Meta />
        <ThemeScript nonce={nonce} defaultTheme="light" attribute="class" />
        <Links />
      </head>
      <body className="h-auto w-full">
        {children}

        {data?.ENV.fathomId && data?.ENV.nodeEnv === 'production' && (
          <FathomAnalytics privateKey={data?.ENV.fathomId} />
        )}
        <Toaster position="top-right" theme={resolvedTheme as 'light' | 'dark'} />
        <MarkerIoEmbed nonce={nonce} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data?.ENV)}`,
          }}
        />
      </body>
    </html>
  );
}

export default function AppWithProviders() {
  const { toast, csrfToken } = useLoaderData<typeof loader>();

  const nonce = useNonce();
  const navigation = useNavigation();
  const fetchers = useFetchers();

  // Renders toast (if any).
  useToast(toast);

  /**
   * This gets the state of every fetcher active on the app and combine it with
   * the state of the global transition (Link and Form), then use them to
   * determine if the app is idle or if it's loading.
   * Here we consider both loading and submitting as loading.
   *
   * We filter fetchers to only include those that are actively submitting or loading
   * with form data, excluding stale or cancelled fetchers that may not transition cleanly.
   */
  const state = useMemo<'idle' | 'loading'>(
    function getGlobalState() {
      const activeFetchers = fetchers.filter(
        (fetcher) => fetcher.state !== 'idle' && fetcher.formData
      );
      const states = [navigation.state, ...activeFetchers.map((fetcher) => fetcher.state)];
      if (states.every((state) => state === 'idle')) return 'idle';
      return 'loading';
    },
    [navigation.state, fetchers]
  );

  useEffect(() => {
    configureProgress();
  }, []);

  useEffect(() => {
    if (state === 'loading') {
      startProgress();
    } else {
      stopProgress();
    }
  }, [state]);

  return (
    <Document nonce={nonce}>
      <AuthenticityTokenProvider token={csrfToken}>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            <Outlet />
          </NuqsAdapter>
        </QueryClientProvider>
      </AuthenticityTokenProvider>
    </Document>
  );
}

function ErrorLayout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();

  return (
    <html lang="en" className="theme-alpha overflow-x-hidden" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <ThemeScript nonce={nonce} defaultTheme="light" attribute="class" />
        <Links />
      </head>
      <body className="h-auto w-full">
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm md:max-w-3xl">{children}</div>
        </div>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let message = "We've encountered a problem, please try again. Sorry!";

  if (isRouteErrorResponse(error)) {
    if (error.statusText === 'AUTH_ERROR') {
      return (
        <ErrorLayout>
          <AuthError />
        </ErrorLayout>
      );
    } else if (error?.data?.message) {
      message = error.data.message;
    } else {
      message = `${error.status} ${error.statusText}`;
    }
  } else if (error instanceof Error) {
    // you only want to capture non 404-errors that reach the boundary
    Sentry.captureException(error);
    message = error.message;
  }

  return (
    <ErrorLayout>
      <GenericError message={message} />
    </ErrorLayout>
  );
}
