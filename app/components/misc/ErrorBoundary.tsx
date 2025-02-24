import type { ErrorResponse } from 'react-router'
import {
  isRouteErrorResponse,
  Link,
  useFetcher,
  useNavigate,
  useParams,
  useRouteError,
} from 'react-router'
import { JSX, useEffect } from 'react'
import { routes } from '@/constants/routes'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { useTheme } from '@/hooks/useTheme'
import PublicLayout from '@/layouts/public/public'
import { Button } from '@/components/ui/button'
import { HomeIcon, RefreshCcwIcon } from 'lucide-react'
import { LogoIcon } from '@/components/logo/logo-icon'
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
  const theme = useTheme()

  if (typeof document !== 'undefined') {
    console.error(error)
  }

  useEffect(() => {
    // Check for 401 Unauthorized error
    if (isRouteErrorResponse(error) && error.status === 401) {
      toast.error('Session expired', {
        description: 'Please sign in again to continue.',
      })

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
    }
  }, [error])

  return (
    <PublicLayout>
      <Card className="overflow-hidden">
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
          <LogoIcon width={64} theme={theme} className="mb-4" />
          <div className="flex flex-col gap-2">
            <h1 className="w-full text-center text-2xl font-bold">
              Whoops! Something went wrong.
            </h1>

            <div className="text-center text-sm text-muted-foreground">
              {isRouteErrorResponse(error)
                ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
                    error,
                    params,
                  })
                : unexpectedErrorHandler(error)}
            </div>
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
