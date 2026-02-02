/**
 * Sentry Breadcrumbs Module
 *
 * Track user journey through form interactions and API calls.
 */

export {
  trackFormSubmit,
  trackFormSuccess,
  trackFormValidationError,
  trackFormError,
  type FormTrackingOptions,
} from './form';

export { trackApiCall, trackApiError, type ApiCallOptions } from './api';
