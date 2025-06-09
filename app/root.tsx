import { FathomAnalytics } from '@/components/fathom/fathom';
import { ClientHintCheck } from '@/components/misc/ClientHints';
import { GenericErrorBoundary } from '@/components/misc/ErrorBoundary';
import { ThemeSwitcher } from '@/components/theme-switcher/theme-switcher';
import { Toaster } from '@/components/ui/sonner';
import { useNonce } from '@/hooks/useNonce';
import { useToast } from '@/hooks/useToast';
import { csrf } from '@/modules/cookie/csrf.server';
import { themeSessionResolver } from '@/modules/cookie/theme.server';
import { getToastSession } from '@/modules/cookie/toast.server';
import { ROUTE_PATH as SET_THEME_ROUTE_PATH } from '@/routes/api+/set-theme';
// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import styles from '@/styles/root.css?url';
import { env } from '@/utils/config/env.server';
import { metaObject } from '@/utils/helpers/meta.helper';
import { isProduction, combineHeaders, cn } from '@/utils/helpers/misc.helper';
import NProgress from 'nprogress';
import { useEffect, useMemo } from 'react';
import {
  Links,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  useFetchers,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type { LinksFunction, LoaderFunctionArgs } from 'react-router';
import { ThemeProvider, useTheme, PreventFlashOnWrongTheme, Theme } from 'remix-themes';
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react';

// NProgress configuration
NProgress.configure({ showSpinner: false });

// Links
export const links: LinksFunction = () => [{ rel: 'stylesheet', href: styles, as: 'style' }];

// Meta
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

// Loader
export async function loader({ request }: LoaderFunctionArgs) {
  const { toast, headers: toastHeaders } = await getToastSession(request);
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request);
  const { getTheme } = await themeSessionResolver(request);

  return data(
    {
      toast,
      csrfToken,
      env: env,
      theme: getTheme(),
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
  const data = useLoaderData<typeof loader>();

  return (
    <ThemeProvider specifiedTheme={data?.theme ?? Theme.LIGHT} themeAction={SET_THEME_ROUTE_PATH}>
      {children}
    </ThemeProvider>
  );
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>();
  return (
    <AuthenticityTokenProvider token={data.csrfToken}>
      <App />
      {data.env.FATHOM_ID && isProduction() && <FathomAnalytics privateKey={data.env.FATHOM_ID} />}
    </AuthenticityTokenProvider>
  );
}

export function App() {
  const data = useLoaderData<typeof loader>();

  const [theme] = useTheme();
  const nonce = useNonce();
  const navigation = useNavigation();
  const fetchers = useFetchers();

  // Renders toast (if any).
  useToast(data.toast);

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

  return (
    <html
      lang="en"
      dir="ltr"
      className={cn(theme, 'overflow-x-hidden')}
      data-theme={theme ?? ''}
      suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ClientHintCheck nonce={nonce} />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body className="bg-background overscroll-none font-sans antialiased">
        <Outlet />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <Toaster closeButton position="top-right" theme={theme ?? Theme.LIGHT} richColors />
        <ThemeSwitcher />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return <GenericErrorBoundary />;
}
