import {
  defaultErrorFormatter as activityUiDefaultFormatter,
  type ErrorFormatter,
  type FormattedError,
} from '@datum-cloud/activity-ui';

/**
 * Cloud-portal's default error formatter for activity-ui surfaces.
 *
 * For v1, this is a thin pass-through to activity-ui's built-in formatter.
 * The hook point exists so we can centralize improvements (e.g. mapping
 * specific 4xx/5xx codes to friendlier copy, integrating with the portal's
 * toast system, etc.) without touching every route consuming the wrapper.
 *
 * Override per-route via `feedProps.errorFormatter` if a page needs
 * different copy.
 */
export const defaultErrorFormatter: ErrorFormatter = (error): FormattedError => {
  // Future enhancement points:
  // - Map 401 → "Your session has expired. Please sign in again."
  // - Map 403 → "You don't have permission to view this activity."
  // - Map 404 → "This activity surface isn't available yet."
  // - Map network errors → friendlier offline copy
  // For now, defer to activity-ui's default.
  return activityUiDefaultFormatter(error);
};
