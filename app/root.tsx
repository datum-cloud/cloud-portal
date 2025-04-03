import { ClientHintCheck } from '@/components/misc/ClientHints'
import { GenericErrorBoundary } from '@/components/misc/ErrorBoundary'
import { ThemeSwitcher } from '@/components/theme-switcher/theme-switcher'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getHints } from '@/hooks/useHints'
import { useNonce } from '@/hooks/useNonce'
import { Theme, getTheme, useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import i18nServer, { localeCookie } from '@/modules/i18n/i18n.server'
import { ROUTE_PATH as CACHE_ROUTE_PATH } from '@/routes/api+/handle-cache'
// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import RootCSS from '@/styles/root.css?url'
import { csrf } from '@/utils/csrf.server'
import { metaObject } from '@/utils/meta'
import { combineHeaders, getDomainUrl } from '@/utils/misc.server'
import { getToastSession } from '@/utils/toast.server'
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
} from 'react-router'
import type { LinksFunction, LoaderFunctionArgs } from 'react-router'
import { useChangeLanguage } from 'remix-i18next/react'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'

// NProgress configuration
NProgress.configure({ showSpinner: false })

export const handle = { i18n: ['translation'] }

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
  const locale = await i18nServer.getLocale(request)
  const { toast, headers: toastHeaders } = await getToastSession(request)
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken()

  return data(
    {
      locale,
      toast,
      csrfToken,
      requestInfo: {
        hints: getHints(request),
        origin: getDomainUrl(request),
        path: new URL(request.url).pathname,
        userPrefs: { theme: getTheme(request) },
      },
    } as const,
    {
      headers: combineHeaders(
        { 'Set-Cookie': await localeCookie.serialize(locale) },
        toastHeaders,
        csrfCookieHeader ? { 'Set-Cookie': csrfCookieHeader } : null,
      ),
    },
  )
}

function Document({
  children,
  nonce,
  lang = 'en',
  dir = 'ltr',
  theme = 'light',
}: {
  children: React.ReactNode
  nonce: string
  lang?: string
  dir?: 'ltr' | 'rtl'
  theme?: Theme
}) {
  return (
    <html
      lang={lang}
      dir={dir}
      className={`${theme} overflow-x-hidden`}
      style={{ colorScheme: theme }}
      suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ClientHintCheck nonce={nonce} />
        <Meta />
        <Links />
      </head>
      <body className="h-auto w-full" suppressHydrationWarning>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <Toaster closeButton position="top-right" theme={theme} richColors />
        <ThemeSwitcher />
      </body>
    </html>
  )
}

export default function AppWithProviders() {
  const { locale, toast, csrfToken } = useLoaderData<typeof loader>()

  const nonce = useNonce()
  const theme = useTheme()
  const navigation = useNavigation()
  const fetchers = useFetchers()

  // Updates the i18n instance language.
  useChangeLanguage(locale)

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
    <Document nonce={nonce} theme={theme} lang={locale ?? 'en'}>
      <AuthenticityTokenProvider token={csrfToken}>
        <Outlet />
      </AuthenticityTokenProvider>
    </Document>
  )
}

export function ErrorBoundary() {
  const nonce = useNonce()
  const theme = useTheme()

  return (
    <Document nonce={nonce} theme={theme}>
      <GenericErrorBoundary />
    </Document>
  )
}
