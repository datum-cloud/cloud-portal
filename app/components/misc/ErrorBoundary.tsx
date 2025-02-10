import type { ErrorResponse } from 'react-router'
import { isRouteErrorResponse, redirect, useParams, useRouteError } from 'react-router'
import { JSX } from 'react'
import { routes } from '@/constants/routes'
import { toast } from 'sonner'

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

  if (typeof document !== 'undefined') {
    console.error(error)
  }

  if (error instanceof Response && error.status === 401) {
    toast.error('Session expired')
    return redirect(routes.auth.signOut)
  }

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
