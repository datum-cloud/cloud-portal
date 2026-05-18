import { AppError } from './app-error';

/**
 * Wrap a React Router loader (or action) to convert thrown `AppError` instances
 * into `Response` objects.
 *
 * Why this is necessary:
 * - React Router treats thrown `Error` instances as 500 responses and strips
 *   custom properties (like `status` on `AppError`) during error serialization.
 * - Thrown `Response` objects, by contrast, are recognised by
 *   `isRouteErrorResponse(error)` and preserve both the HTTP status and the
 *   serialized JSON body (accessible as `error.data` in the boundary).
 *
 * Using this wrapper ensures:
 * - 4xx loader failures (e.g. `NotFoundError` from a service) flow through to
 *   the route error boundary as proper `ErrorResponse`s with the correct
 *   status code.
 * - The `GenericError` UI can read the status and render user-facing copy
 *   ("We couldn't find that page." for 404, "You don't have access to this."
 *   for 403, etc.) instead of the generic 5xx fallback.
 * - The HTTP response code on the document matches the underlying error
 *   (404, 403, ...) rather than always being 500.
 *
 * Non-`AppError` throws are re-thrown unchanged so genuine unexpected errors
 * still surface to Sentry via `handleError` / the error boundary.
 *
 * @example
 *   export const loader = withLoaderErrors(async ({ params }: LoaderFunctionArgs) => {
 *     const svc = createDnsZoneService();
 *     const zone = await svc.get(params.projectId!, params.dnsZoneId!);
 *     if (!zone) throw new NotFoundError('DNS Zone', params.dnsZoneId);
 *     return data(zone);
 *   });
 */
export function withLoaderErrors<Args, Result>(
  fn: (args: Args) => Promise<Result>
): (args: Args) => Promise<Result> {
  return async (args: Args) => {
    try {
      return await fn(args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error.toResponse();
      }
      throw error;
    }
  };
}
