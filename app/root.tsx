import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ClientHintCheck } from '@/components/misc/ClientHints';
import { GenericErrorBoundary } from '@/components/misc/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getHints } from '@/hooks/useHints';
import { useNonce } from '@/hooks/useNonce';
import { useToast } from '@/hooks/useToast';
import { csrf } from '@/modules/cookie/csrf.server';
import { themeSessionResolver } from '@/modules/cookie/theme.server';
import { getToastSession } from '@/modules/cookie/toast.server';
import { FathomAnalytics } from '@/modules/fathom/fathom';
import { HelpScoutBeacon } from '@/modules/helpscout';
import MarkerIoEmbed from '@/modules/markerio';
import { queryClient } from '@/modules/tanstack/query';
import { ROUTE_PATH as CACHE_ROUTE_PATH } from '@/routes/api/action/set-cache';
// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import RootCSS from '@/styles/root.css?url';
import { getSharedEnvs } from '@/utils/environment';
import { isProduction } from '@/utils/environment';
import { metaObject } from '@/utils/meta';
import { combineHeaders, getDomainUrl } from '@/utils/path';
import { QueryClientProvider } from '@tanstack/react-query';
import NProgress from 'nprogress';
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7';
import { useEffect, useMemo } from 'react';
import {
  Links,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  useBeforeUnload,
  useFetchers,
  useLoaderData,
  useNavigation,
  useRouteLoaderData,
} from 'react-router';
import type { LinksFunction, LoaderFunctionArgs } from 'react-router';
import { ThemeProvider, useTheme, PreventFlashOnWrongTheme, Theme } from 'remix-themes';
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react';

// NProgress configuration
NProgress.configure({ showSpinner: false });

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
  const sharedEnv = getSharedEnvs();
  const { getTheme } = await themeSessionResolver(request);

  return data(
    {
      toast,
      csrfToken,
      sharedEnv,
      theme: getTheme(),
      requestInfo: {
        hints: getHints(request),
        origin: getDomainUrl(request),
        path: new URL(request.url).pathname,
      },
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
  const data = useRouteLoaderData<typeof loader>('root');

  return (
    <ThemeProvider specifiedTheme={data?.theme ?? Theme.LIGHT} themeAction="/api/set-theme">
      {children}
    </ThemeProvider>
  );
}

function Document({
  children,
  nonce,
  lang = 'en',
  dir = 'ltr',
}: {
  children: React.ReactNode;
  nonce: string;
  lang?: string;
  dir?: 'ltr' | 'rtl';
}) {
  const data = useLoaderData<typeof loader>();
  const [theme] = useTheme();

  return (
    <html lang={lang} dir={dir} className={`${theme} overflow-x-hidden`} data-theme={theme ?? ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ClientHintCheck nonce={nonce} />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body className="h-auto w-full">
        {children}
        <MarkerIoEmbed nonce={nonce} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <Toaster closeButton position="top-right" theme={theme ?? Theme.LIGHT} richColors />
        {/* <ThemeSwitcher /> */}
      </body>
    </html>
  );
}

export default function AppWithProviders() {
  const { toast, csrfToken, sharedEnv } = useLoaderData<typeof loader>();

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
   */
  const state = useMemo<'idle' | 'loading'>(
    function getGlobalState() {
      const states = [navigation.state, ...fetchers.map((fetcher) => fetcher.state)];
      if (states.every((state) => state === 'idle')) return 'idle';
      return 'loading';
    },
    [navigation.state, fetchers]
  );

  useEffect(() => {
    // and when it's something else it means it's either submitting a form or
    // waiting for the loaders of the next location so we start it
    if (state === 'loading') NProgress.start();
    // when the state is idle then we can to complete the progress bar
    if (state === 'idle') NProgress.done();
  }, [state]);

  /**
   * Clears the application cache by making a POST request to the cache route
   * when the user is about to leave/reload the page.
   * This ensures that any cached data is properly cleared to maintain data consistency
   * and prevent stale cache issues on subsequent visits.
   */
  useBeforeUnload(() => {
    // Clear Cache with hit API
    fetch(CACHE_ROUTE_PATH, { method: 'POST' });
  });

  return (
    <Document nonce={nonce} lang="en">
      <AuthenticityTokenProvider token={csrfToken}>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            <TooltipProvider>
              <ConfirmationDialogProvider>
                {sharedEnv.FATHOM_ID && isProduction() && (
                  <FathomAnalytics privateKey={sharedEnv.FATHOM_ID} />
                )}
                {sharedEnv.HELPSCOUT_BEACON_ID && isProduction() && (
                  <HelpScoutBeacon beaconId={sharedEnv.HELPSCOUT_BEACON_ID} />
                )}
                <Outlet />
              </ConfirmationDialogProvider>
            </TooltipProvider>
          </NuqsAdapter>
        </QueryClientProvider>
      </AuthenticityTokenProvider>
    </Document>
  );
}

export function ErrorBoundary() {
  const nonce = useNonce();

  return (
    <Document nonce={nonce}>
      <GenericErrorBoundary />
    </Document>
  );
}
