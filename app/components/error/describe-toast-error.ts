import { API_GROUP_LABELS } from '@/utils/errors/api-group-labels';
import { errorOwnMessage, errorRawText } from '@/utils/errors/error-text';
import { describeApiError } from '@datum-cloud/datum-ui/error-content';

export interface ToastErrorDescription {
  title: string;
  /** The plain explanation shown under the title. */
  message?: string;
  /** The raw technical text, behind "Show details". */
  detail?: string;
  requestId?: string;
}

export interface ToastErrorOptions {
  /** The call site's own title, kept as the toast title. */
  title?: string;
  /** The call site's own message, shown instead of the description. */
  message?: string;
}

/**
 * What an error toast shows: the call site's title (or a plain headline),
 * a plain explanation that names the product area for a permission denial,
 * and the raw text and request ID for "Show details". The raw text is left
 * out when it would only repeat what the toast already says.
 */
/**
 * datum-ui's advice for a permission denial names the project, but toasts
 * also fire on organization and account pages, so they use wording that fits
 * every scope.
 */
const PROJECT_ACCESS_ADVICE = 'Ask an administrator of this project for access.';
const ACCESS_ADVICE = 'Ask an administrator for access.';

export function describeToastError(
  error: unknown,
  options: ToastErrorOptions = {}
): ToastErrorDescription {
  const described = describeApiError(error, { apiGroupLabels: API_GROUP_LABELS });
  const title = options.title ?? described.title;
  const advice =
    described.description === PROJECT_ACCESS_ADVICE ? ACCESS_ADVICE : described.description;
  const explanation = options.title ? [described.title, advice].filter(Boolean).join(' ') : advice;
  // Many callers pass the error's own message as their description; that
  // adds nothing and would hide the explanation, so it counts as no message.
  const callerMessage =
    options.message && options.message !== errorOwnMessage(error) ? options.message : undefined;
  const message = callerMessage ?? (explanation || undefined);
  const detail = errorRawText(error);

  return {
    title,
    ...(message && { message }),
    // Left out when it would only repeat what the toast already says.
    ...(detail && detail !== message && detail !== title && { detail }),
    ...(described.requestId && { requestId: described.requestId }),
  };
}
