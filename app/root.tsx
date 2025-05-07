import { FathomAnalytics } from '@/components/fathom/fathom'
import { ClientHintCheck } from '@/components/misc/ClientHints'
import { GenericErrorBoundary } from '@/components/misc/ErrorBoundary'
import { ThemeSwitcher } from '@/components/theme-switcher/theme-switcher'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getHints } from '@/hooks/useHints'
import { useNonce } from '@/hooks/useNonce'
import { useToast } from '@/hooks/useToast'
import { csrf } from '@/modules/cookie/csrf.server'
import { themeSessionResolver } from '@/modules/cookie/theme.server'
import { getToastSession } from '@/modules/cookie/toast.server'
import { ROUTE_PATH as CACHE_ROUTE_PATH } from '@/routes/api+/cache'
import { ROUTE_PATH as SET_THEME_ROUTE_PATH } from '@/routes/api+/set-theme'
// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import RootCSS from '@/styles/root.css?url'
import { getSharedEnvs } from '@/utils/env'
import { metaObject } from '@/utils/meta'
import { isProduction, combineHeaders, getDomainUrl } from '@/utils/misc'
import NProgress from 'nprogress'
import { useEffect, useMemo } from 'react'
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
} from 'react-router'
import type { LinksFunction, LoaderFunctionArgs } from 'react-router'
import { ThemeProvider, useTheme, PreventFlashOnWrongTheme, Theme } from 'remix-themes'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'

// NProgress configuration
NProgress.configure({ showSpinner: false })

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  // Get the current page title from the pathname
  const getPageTitle = () => {
    const path = location.pathname
    // Remove leading slash and convert to title case
    if (path === '/') return 'Home'

    const pageName = path.split('/').pop() || ''
    return pageName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const pageTitle = getPageTitle()

  return metaObject(data ? pageTitle : 'Error')
}

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: RootCSS }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { toast, headers: toastHeaders } = await getToastSession(request)
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken(request)
  const sharedEnv = getSharedEnvs()
  const { getTheme } = await themeSessionResolver(request)

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
        csrfCookieHeader ? { 'Set-Cookie': csrfCookieHeader } : null,
      ),
    },
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>('root')

  return (
    <ThemeProvider
      specifiedTheme={data?.theme ?? Theme.LIGHT}
      themeAction={SET_THEME_ROUTE_PATH}>
      {children}
    </ThemeProvider>
  )
}

function Document({
  children,
  nonce,
  lang = 'en',
  dir = 'ltr',
}: {
  children: React.ReactNode
  nonce: string
  lang?: string
  dir?: 'ltr' | 'rtl'
}) {
  const data = useLoaderData<typeof loader>()
  const [theme] = useTheme()

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${theme} overflow-x-hidden`}
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
      <body className="h-auto w-full" suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <Toaster
          closeButton
          position="top-right"
          theme={theme ?? Theme.LIGHT}
          richColors
        />
        <ThemeSwitcher />
      </body>
    </html>
  )
}

export default function AppWithProviders() {
  const { toast, csrfToken, sharedEnv } = useLoaderData<typeof loader>()

  const nonce = useNonce()
  const navigation = useNavigation()
  const fetchers = useFetchers()

  // Renders toast (if any).
  useToast(toast)

  /**
   * This gets the state of every fetcher active on the app and combine it with
   * the state of the global transition (Link and Form), then use them to
   * determine if the app is idle or if it's loading.
   * Here we consider both loading and submitting as loading.
   */
  const state = useMemo<'idle' | 'loading'>(
    function getGlobalState() {
      const states = [navigation.state, ...fetchers.map((fetcher) => fetcher.state)]
      if (states.every((state) => state === 'idle')) return 'idle'
      return 'loading'
    },
    [navigation.state, fetchers],
  )

  useEffect(() => {
    // and when it's something else it means it's either submitting a form or
    // waiting for the loaders of the next location so we start it
    if (state === 'loading') NProgress.start()
    // when the state is idle then we can to complete the progress bar
    if (state === 'idle') NProgress.done()
  }, [state])

  /**
   * Clears the application cache by making a POST request to the cache route
   * when the user is about to leave/reload the page.
   * This ensures that any cached data is properly cleared to maintain data consistency
   * and prevent stale cache issues on subsequent visits.
   */
  useBeforeUnload(() => {
    // Clear Cache with hit API
    fetch(CACHE_ROUTE_PATH, { method: 'POST' })
  })

  return (
    <Document nonce={nonce} lang="en">
      <AuthenticityTokenProvider token={csrfToken}>
        {sharedEnv.FATHOM_ID && isProduction() && (
          <FathomAnalytics privateKey={sharedEnv.FATHOM_ID} />
        )}
        <Outlet />
      </AuthenticityTokenProvider>
    </Document>
  )
}

export function ErrorBoundary() {
  const nonce = useNonce()

  return (
    <Document nonce={nonce}>
      <GenericErrorBoundary />
    </Document>
  )
}
