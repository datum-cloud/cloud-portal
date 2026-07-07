import { AuthError } from '@/components/error/auth';
import { GenericError } from '@/components/error/generic';
import { ClientHintCheck } from '@/components/misc/client-hints';
import { DynamicFaviconLinks } from '@/components/misc/dynamic-favicon';
import { useNonce } from '@/hooks/useNonce';
import { GraphQLProvider } from '@/modules/graphql/provider';
import { queryClient } from '@/modules/tanstack/query';
// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import RootCSS from '@/styles/root.css?url';
import { csrf, getToastSession } from '@/utils/cookies';
import { env } from '@/utils/env/env.server';
import { isUserFacingErrorStatus } from '@/utils/errors/app-error';
import { metaObject } from '@/utils/helpers/meta.helper';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { ConformAdapter } from '@datum-cloud/datum-ui/form/adapters/conform';
import { configureProgress, startProgress, stopProgress } from '@datum-cloud/datum-ui/nprogress';
import { ThemeProvider, ThemeScript, useTheme } from '@datum-cloud/datum-ui/theme';
import { Toaster, useToast } from '@datum-cloud/datum-ui/toast';
import * as Sentry from '@sentry/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import type { SSRData } from '@urql/core';
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
  useMatches,
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
  return [
    {
      rel: 'preload',
      href: '/fonts/CanelaText-Regular.ttf',
      as: 'font',
      type: 'font/ttf',
      crossOrigin: 'anonymous',
    },
    { rel: 'stylesheet', href: RootCSS },
  ];
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

/** Skip root revalidation for client-side Link navigations.
 * Root loader only provides toast, csrf, ENV — none change per-route.
 * Form submissions still revalidate (e.g. logout) via defaultShouldRevalidate. */
export function shouldRevalidate({
  currentUrl: _currentUrl,
  nextUrl: _nextUrl,
  defaultShouldRevalidate,
  formData,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
  formData?: FormData;
}) {
  // Form submissions (logout, etc.) — revalidate to get fresh root data
  if (formData) return defaultShouldRevalidate;

  // Link navigation — skip; root data doesn't change
  return false;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      defaultTheme="light"
      attribute="class"
      storageKey="datum-cloud-theme"
      enableSystem>
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
      <body className="!bg-background h-auto w-full">
        {children}

        <Toaster position="top-right" theme={resolvedTheme as 'light' | 'dark'} />
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

/** Fetcher keys that run in the background and should not trigger the progress bar */
const BACKGROUND_FETCHER_KEYS = ['session-cookies'] as const;

export default function AppWithProviders() {
  const { toast, csrfToken } = useLoaderData<typeof loader>();

  const nonce = useNonce();
  const navigation = useNavigation();
  const fetchers = useFetchers();
  const matches = useMatches();

  const urqlState = useMemo<SSRData>(() => {
    return matches.reduce<SSRData>((acc, match) => {
      const state = (match.data as Record<string, unknown> | null)?.urqlState;
      if (state && typeof state === 'object') {
        return { ...acc, ...(state as SSRData) };
      }
      return acc;
    }, {});
  }, [matches]);

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
   * Background fetchers (e.g. session cookie sync) are excluded from progress.
   */
  const state = useMemo<'idle' | 'loading'>(
    function getGlobalState() {
      const activeFetchers = fetchers.filter(
        (fetcher) =>
          fetcher.state !== 'idle' &&
          fetcher.formData &&
          !(BACKGROUND_FETCHER_KEYS as readonly string[]).includes(fetcher.key)
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

  // Global safety net for a Radix limitation: `@radix-ui/react-dismissable-layer`
  // stores the body's original `pointer-events` in a single module-level global
  // shared across independent modal layers. Opening a modal Dialog while another
  // modal layer (e.g. a Popover/dropdown) is still open corrupts that value to
  // "none", so on close the body stays `pointer-events: none` and the entire app
  // becomes unclickable. When the body is stuck at "none" while no Radix modal
  // layer is actually open, clear it so interaction is restored.
  // TODO: Remove once fixed centrally in @datum-cloud/datum-ui's Dialog (the
  // library is under audit; this guard is the interim app-wide fix).
  useEffect(() => {
    const body = document.body;
    const clearIfStuck = () => {
      if (body.style.pointerEvents !== 'none') return;
      const modalLayerOpen = document.querySelector(
        '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
      );
      if (!modalLayerOpen) {
        body.style.pointerEvents = '';
      }
    };
    const observer = new MutationObserver(clearIfStuck);
    observer.observe(body, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Document nonce={nonce}>
      <AuthenticityTokenProvider token={csrfToken}>
        <QueryClientProvider client={queryClient}>
          <GraphQLProvider urqlState={urqlState}>
            <NuqsAdapter>
              <ConformAdapter>
                <Outlet />
              </ConformAdapter>
            </NuqsAdapter>
          </GraphQLProvider>
        </QueryClientProvider>
      </AuthenticityTokenProvider>
    </Document>
  );
}

function ErrorLayout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();

  return (
    <html
      lang="en"
      className="theme-alpha bg-background overflow-x-hidden"
      suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <ThemeScript nonce={nonce} defaultTheme="light" attribute="class" />
        <Links />
      </head>
      <body className="!bg-background h-auto w-full">
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
  let status: number | undefined;

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
    status = error.status;
  } else if (error instanceof Error) {
    // Skip expected user-facing statuses (401/403/404). Other 4xx reaching the
    // boundary likely indicate a bug, so we still capture them.
    // The `status` field on AppError survives React Router's error serialization,
    // so this duck-typed check works during both SSR hydration and client navigation.
    status = (error as { status?: number }).status;
    if (!isUserFacingErrorStatus(status)) {
      Sentry.captureException(error);
    }
    message = error.message;
  }

  return (
    <ErrorLayout>
      <GenericError message={message} status={status} />
    </ErrorLayout>
  );
}
