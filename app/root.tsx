import {
  Links,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  data,
  useLoaderData,
} from '@remix-run/react'
import type { LinksFunction, LoaderFunctionArgs, TypedResponse } from '@remix-run/node'
import { useChangeLanguage } from 'remix-i18next/react'

import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'

// Import global CSS styles for the application
// The ?url query parameter tells the bundler to handle this as a URL import
import RootCSS from '@/styles/root.css?url'
import { SITE_CONFIG } from '@/constants/brand'
import { combineHeaders, getDomainUrl } from '@/utils/misc.server'
import { getToastSession } from '@/utils/toast.server'
import { csrf } from '@/utils/csrf.server'
import { getHints } from '@/hooks/useHints'
import { getTheme, Theme, useTheme } from '@/hooks/useTheme'
import i18nServer, { localeCookie } from '@/modules/i18n/i18n.server'
import { Toaster } from '@/components/ui/sonner'
import { ClientHintCheck } from '@/components/misc/ClientHints'
import { useNonce } from '@/hooks/useNonce'
import { useToast } from '@/hooks/useToast'
import { GenericErrorBoundary } from '@/components/misc/ErrorBoundary'
import { TooltipProvider } from '@/components/ui/tooltip'
import { honeypot } from '@/utils/honeypot.server'

export const handle = { i18n: ['translation'] }

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: data ? `${SITE_CONFIG.siteTitle}` : `Error | ${SITE_CONFIG.siteTitle}`,
    },
    {
      name: 'description',
      content: SITE_CONFIG.siteDescription,
    },
  ]
}

export const links: LinksFunction = () => {
  return [{ rel: 'stylesheet', href: RootCSS }]
}

export type LoaderData = Exclude<
  Awaited<ReturnType<typeof loader>>,
  Response | TypedResponse<unknown>
>

export async function loader({ request }: LoaderFunctionArgs) {
  const user = null

  const locale = await i18nServer.getLocale(request)
  const { toast, headers: toastHeaders } = await getToastSession(request)
  const [csrfToken, csrfCookieHeader] = await csrf.commitToken()

  return data(
    {
      user,
      locale,
      toast,
      csrfToken,
      honeypotProps: honeypot.getInputProps(),
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
      style={{ colorScheme: theme }}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ClientHintCheck nonce={nonce} />
        <Meta />
        <Links />
      </head>
      <body className="h-auto w-full">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <Toaster closeButton position="top-right" theme={theme} />
      </body>
    </html>
  )
}

export default function AppWithProviders() {
  const { locale, toast, csrfToken, honeypotProps } = useLoaderData<typeof loader>()

  const nonce = useNonce()
  const theme = useTheme()

  // Updates the i18n instance language.
  useChangeLanguage(locale)

  // Renders toast (if any).
  useToast(toast)

  return (
    <Document nonce={nonce} theme={theme} lang={locale ?? 'en'}>
      <AuthenticityTokenProvider token={csrfToken}>
        <HoneypotProvider {...honeypotProps}>
          <Outlet />
        </HoneypotProvider>
      </AuthenticityTokenProvider>
    </Document>
  )
}

export function ErrorBoundary() {
  const nonce = useNonce()
  const theme = useTheme()

  return (
    <Document nonce={nonce} theme={theme}>
      <GenericErrorBoundary
        statusHandlers={{
          403: ({ error }) => (
            <p>You are not allowed to do that: {error?.data.message}</p>
          ),
        }}
      />
    </Document>
  )
}
