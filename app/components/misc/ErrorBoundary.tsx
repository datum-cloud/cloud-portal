import { LogoIcon } from '@/components/logo/logo-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { routes } from '@/constants/routes'
import PublicLayout from '@/layouts/public/public'
import { isDevelopment } from '@/utils/misc'
import { HomeIcon, Loader2, RefreshCcwIcon } from 'lucide-react'
import { JSX, useEffect, useState } from 'react'
import type { ErrorResponse } from 'react-router'
import {
  Link,
  isRouteErrorResponse,
  useFetcher,
  useNavigate,
  useParams,
  useRouteError,
} from 'react-router'

type StatusHandler = (info: {
  error: ErrorResponse
  params: Record<string, string | undefined>
}) => JSX.Element | null

type GenericErrorBoundaryProps = {
  defaultStatusHandler?: StatusHandler
  statusHandlers?: Record<number, StatusHandler>
  unexpectedErrorHandler?: (error: unknown) => JSX.Element | null
}

export function GenericErrorBoundary({
  statusHandlers,
  defaultStatusHandler = ({ error }) => (
    <p>{error.statusText ? error.statusText : error.data}</p>
  ),
  unexpectedErrorHandler = (error) => <p>{getErrorMessage(error)}</p>,
}: GenericErrorBoundaryProps) {
  const params = useParams()
  const error = useRouteError()
  const navigate = useNavigate()
  const fetcher = useFetcher()
  const [isLoading, setIsLoading] = useState<boolean>(true)

  if (typeof document !== 'undefined') {
    console.error(error)
  }

  useEffect(() => {
    // Check for 401 Unauthorized error
    if (isRouteErrorResponse(error) && error.status === 401) {
      // Perform sign out
      const signOut = async () => {
        try {
          // Call your sign out endpoint
          await fetcher.submit(null, {
            method: 'POST',
            action: routes.auth.logOut,
          })

          // Redirect to login page
          navigate(routes.auth.logIn)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // Fallback: just redirect to login if the logout request fails
          navigate(routes.auth.logIn)
        }
      }

      signOut()
    } else {
      setIsLoading(false)
    }
  }, [error])

  return (
    <PublicLayout>
      <Card className="overflow-hidden">
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
          <LogoIcon width={64} className="mb-4" />
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <div className="flex max-w-xl flex-col gap-2">
                <p className="w-full text-center text-2xl font-bold">
                  Whoops! Something went wrong.
                </p>

                {isDevelopment() ? (
                  <div className="text-muted-foreground text-center text-sm">
                    {isRouteErrorResponse(error)
                      ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
                          error,
                          params,
                        })
                      : unexpectedErrorHandler(error)}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center text-sm">
                    Something went wrong on our end. Our team has been notified, and
                    we&apos;re working to fix it. Please try again later. If the issue
                    persists, reach out to{' '}
                    <Link
                      to={`mailto:support@datum.net`}
                      className="text-primary underline">
                      support@datum.net
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link to={routes.home}>
                  <Button size="sm">
                    <HomeIcon className="size-4" />
                    Back to Home
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(0)
                  }}>
                  <RefreshCcwIcon className="size-4" />
                  Refresh Page
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </PublicLayout>
  )
}

export function getErrorMessage(err: unknown) {
  if (typeof err === 'string') return err
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof err.message === 'string'
  ) {
    return err.message
  }
  console.error('Unable to get error message for error:', err)
  return 'Unknown error'
}
