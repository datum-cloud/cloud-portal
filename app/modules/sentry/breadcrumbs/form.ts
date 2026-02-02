/**
 * Sentry Form Breadcrumbs
 *
 * Tracks form interactions as Sentry breadcrumbs.
 * Privacy: Only tracks field names, never field values.
 */
import * as Sentry from '@sentry/react-router';

export interface FormTrackingOptions {
  formName: string;
  formId?: string;
}

/**
 * Track form submission attempt.
 */
export function trackFormSubmit(options: FormTrackingOptions): void {
  Sentry.addBreadcrumb({
    category: 'form',
    message: `Form submit: ${options.formName}`,
    level: 'info',
    data: {
      formName: options.formName,
      formId: options.formId,
      action: 'submit',
    },
  });
}

/**
 * Track successful form submission.
 */
export function trackFormSuccess(options: FormTrackingOptions): void {
  Sentry.addBreadcrumb({
    category: 'form',
    message: `Form success: ${options.formName}`,
    level: 'info',
    data: {
      formName: options.formName,
      formId: options.formId,
      action: 'success',
    },
  });
}

/**
 * Track form validation error.
 * Only logs field names, not values (privacy).
 */
export function trackFormValidationError(
  options: FormTrackingOptions & { fieldErrors: Record<string, string[]> }
): void {
  const errorFields = Object.keys(options.fieldErrors);

  Sentry.addBreadcrumb({
    category: 'form',
    message: `Form validation error: ${options.formName}`,
    level: 'warning',
    data: {
      formName: options.formName,
      formId: options.formId,
      action: 'validation_error',
      errorFields,
      errorCount: errorFields.length,
    },
  });
}

/**
 * Track form submission error (API error).
 */
export function trackFormError(options: FormTrackingOptions & { error: Error }): void {
  Sentry.addBreadcrumb({
    category: 'form',
    message: `Form error: ${options.formName}`,
    level: 'error',
    data: {
      formName: options.formName,
      formId: options.formId,
      action: 'error',
      errorMessage: options.error.message,
    },
  });
}
