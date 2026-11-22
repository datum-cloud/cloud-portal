import { API_GROUP_LABELS } from '@/utils/errors/api-group-labels';
import { errorOwnMessage, errorRawText } from '@/utils/errors/error-text';
import { describeApiError } from '@datum-cloud/datum-ui/error-content';

export interface ErrorPageDescription {
  /** Replaces the page's 403 title when the denial names a labelled product area. */
  title?: string;
  /** The raw denial, shown under "Error details". */
  detail?: string;
}

/**
 * What the error page adds for a permission error: the product area in the
 * title (#722) and the raw RBAC denial as details. `error` is the route
 * error body (`AppError#toJSON`) or a thrown `AppError`; both carry
 * `originalMessage`. Other statuses get nothing, so their page is unchanged.
 */
export function describeErrorPage(
  error: unknown,
  status: number | undefined
): ErrorPageDescription {
  if (status !== 403) return {};

  const labelled = describeApiError(error, { apiGroupLabels: API_GROUP_LABELS });
  const plain = describeApiError(error);
  const detail = errorRawText(error);
  return {
    // Only when a label applied: an unlabelled denial keeps the page's wording.
    ...(labelled.title !== plain.title && { title: labelled.title }),
    ...(detail && detail !== errorOwnMessage(error) && { detail }),
  };
}
