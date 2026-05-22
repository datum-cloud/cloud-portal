import {
  ApiError,
  defaultErrorFormatter as activityUiDefaultFormatter,
  type ErrorFormatter,
  type FormattedError,
} from '@datum-cloud/activity-ui';

/**
 * Reads an HTTP status code off an activity-ui error if one is present.
 *
 * activity-ui surfaces API failures as `ApiError` instances carrying a
 * `statusCode`. We also defensively probe `status` / `response.status` so that
 * a future error shape (or a wrapped error) is still classified correctly.
 */
function getStatusCode(error: Error): number | undefined {
  if (error instanceof ApiError) {
    return error.statusCode;
  }

  const candidate = error as unknown as {
    statusCode?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };

  const code = candidate.statusCode ?? candidate.status ?? candidate.response?.status;
  return typeof code === 'number' ? code : undefined;
}

/**
 * Cloud-portal's default error formatter for activity-ui surfaces.
 *
 * `ActivityFeed` only exposes error handling via this `errorFormatter`
 * (string/node copy rendered by its built-in error UI) — it has no error
 * render slot or `onError` hook — so permission and availability messaging is
 * centralized here.
 *
 * Override per-route via `feedProps.errorFormatter` if a page needs
 * different copy.
 */
export const defaultErrorFormatter: ErrorFormatter = (error): FormattedError => {
  const status = getStatusCode(error);

  // 403 → the user lacks permission to view this activity surface.
  if (status === 403) {
    return {
      message: "You don't have permission to view activity.",
      technical: error.message,
    };
  }

  // 404 → the activity surface hasn't been provisioned for this scope yet.
  if (status === 404) {
    return {
      message: "This activity surface isn't available yet.",
      technical: error.message,
    };
  }

  // Defer everything else to activity-ui's default formatter.
  return activityUiDefaultFormatter(error);
};
