import { GenericErrorBoundary } from './components/misc/ErrorBoundary';
import { routes } from './constants/routes';
import { authenticator } from './modules/auth/auth.server';
import { queryClient } from './modules/tanstack/query';
import { AppProvider } from './providers/app.provider';
import { createAPIFactory } from './resources/api/api-factory.server';
import { authAPI } from './resources/api/auth.api';
import { iamOrganizationsAPI } from './resources/api/iam/organizations.api';
import { organizationCookie } from './utils/cookies';
import { csrf } from './utils/helpers/csrf.helper';
import { FathomAnalytics } from '@/components/fathom/fathom';
import { ClientHintCheck } from '@/components/misc/ClientHints';
import { ThemeSwitcher } from '@/components/theme-switcher/theme-switcher';
import { Toaster } from '@/components/ui/sonner';
import { useNonce } from '@/hooks/useNonce';
import { useToast } from '@/hooks/useToast';
// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import styles from '@/styles/root.css?url';
import { env } from '@/utils/config/env.server';
import { themeSessionResolver } from '@/utils/cookies/theme';
import { getToastSession } from '@/utils/cookies/toast';
import { metaObject } from '@/utils/helpers/meta.helper';
import { isProduction, combineHeaders, cn } from '@/utils/helpers/misc.helper';
import { QueryClientProvider } from '@tanstack/react-query';
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
  isRouteErrorResponse,
  redirect,
  useFetchers,
  useLoaderData,
  useNavigate,
  useNavigation,
  useRouteError,
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

export async function loader({ request }: LoaderFunctionArgs) {
  const { toast, headers: toastHeaders } = await getToastSession(request);
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request);
  const { getTheme } = await themeSessionResolver(request);

  let user = null;
  let token = null;
  let organization = null;
  const isAuthenticated = await authenticator.isAuthenticated(request);

  if (isAuthenticated) {
    const session = await authenticator.getSession(request);

    token = session?.accessToken;
    user = await authAPI().profile(session?.accessToken ?? '');

    const { data: orgCookie } = await organizationCookie.get(request);

    if (orgCookie?.id && token) {
      const apiClient = createAPIFactory(token);
      organization = await iamOrganizationsAPI(apiClient).detail(orgCookie?.id);
    }
  }

  return data(
    {
      toast,
      csrfToken,
      ENV: {
        API_URL: env.API_URL,
        FATHOM_ID: env.FATHOM_ID,
      },
      theme: getTheme(),
      user,
      token,
      organization,
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
    <ThemeProvider specifiedTheme={data?.theme ?? Theme.LIGHT} themeAction={routes.action.setTheme}>
      {children}
    </ThemeProvider>
  );
}

export default function AppWithProviders() {
  const data = useLoaderData<typeof loader>();
  return (
    <AuthenticityTokenProvider token={data.csrfToken}>
      <AppProvider
        user={data.user ?? undefined}
        token={data.token ?? undefined}
        organization={data.organization ?? undefined}>
        <QueryClientProvider client={queryClient}>
          <App />
          {data.ENV.FATHOM_ID && isProduction() && (
            <FathomAnalytics privateKey={data.ENV.FATHOM_ID} />
          )}
        </QueryClientProvider>
      </AppProvider>
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
        <script nonce={nonce} suppressHydrationWarning>
          {`window.ENV = ${JSON.stringify(data.ENV)};`}
        </script>
      </body>
    </html>
  );
}

function ErrorLayout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce();
  const [theme] = useTheme();

  return (
    <html lang="en" className={cn(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background theme-alpha overscroll-none font-sans antialiased">
        {children}

        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
export function ErrorBoundary() {
  return (
    <ErrorLayout>
      <GenericErrorBoundary />
    </ErrorLayout>
  );
}
