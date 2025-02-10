import type { ErrorResponse } from 'react-router'
import {
  isRouteErrorResponse,
  useFetcher,
  useNavigate,
  useParams,
  useRouteError,
} from 'react-router'
import { JSX, useEffect } from 'react'
import { routes } from '@/constants/routes'
import { toast } from 'sonner'
import { ROUTE_PATH as LOGOUT_ROUTE_PATH } from '@/routes/api+/sign-out'

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
    <p>
      {error.status} {error.status} {error.data}
    </p>
  ),
  unexpectedErrorHandler = (error) => <p>{getErrorMessage(error)}</p>,
}: GenericErrorBoundaryProps) {
  const params = useParams()
  const error = useRouteError()
  const navigate = useNavigate()
  const fetcher = useFetcher()

  if (typeof document !== 'undefined') {
    console.error(error)
  }

  useEffect(() => {
    // Check for 401 Unauthorized error
    if (isRouteErrorResponse(error) && error.status === 401) {
      // Perform sign out
      const signOut = async () => {
        try {
          toast.error('Session expired', {
            description: 'Please sign in again to continue.',
          })

          // Call your sign out endpoint
          await fetcher.submit(null, {
            method: 'POST',
            action: LOGOUT_ROUTE_PATH,
          })
          // Redirect to login page
          navigate(routes.auth.signIn)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // Fallback: just redirect to login if the logout request fails
          navigate(routes.auth.signIn)
        }
      }

      signOut()
    }
  }, [error])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      {isRouteErrorResponse(error)
        ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
            error,
            params,
          })
        : unexpectedErrorHandler(error)}
    </div>
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
