/**
 * Sentry Module
 *
 * Centralized Sentry integration for enterprise applications.
 *
 * ## Context (hierarchical enrichment)
 * - setSentryUser / clearSentryUser - User identity
 * - setSentryOrgContext / clearSentryOrgContext - Organization
 * - setSentryProjectContext / clearSentryProjectContext - Project
 * - setSentryResourceContext / clearSentryResourceContext - K8s Resource
 *
 * ## Breadcrumbs (user journey tracking)
 * - trackFormSubmit / trackFormSuccess / trackFormError - Form interactions
 * - trackApiCall / trackApiError - API calls
 *
 * ## Capture (error reporting)
 * - captureError - Capture errors with context
 * - captureApiError - Capture API errors with resource context and fingerprinting
 * - captureMessage - Capture messages
 * - addBreadcrumb - Add custom breadcrumbs
 *
 * ## Tracing (performance monitoring)
 * - sentryTracingMiddleware - Hono HTTP tracing
 */

// Context - hierarchical enrichment
export {
  // User
  setSentryUser,
  clearSentryUser,
  type SentryUser,
  // Organization
  setSentryOrgContext,
  clearSentryOrgContext,
  type OrganizationContext,
  // Project
  setSentryProjectContext,
  clearSentryProjectContext,
  type ProjectContext,
  // Resource
  parseApiVersion,
  isKubernetesResource,
  setSentryResourceContext,
  clearSentryResourceContext,
  parseResourceFromUrl,
  setResourceContextFromUrl,
  type KubernetesResource,
  type UrlResourceInfo,
} from './context';

// Breadcrumbs - user journey tracking
export {
  // Form
  trackFormSubmit,
  trackFormSuccess,
  trackFormValidationError,
  trackFormError,
  type FormTrackingOptions,
  // API
  trackApiCall,
  trackApiError,
  type ApiCallOptions,
} from './breadcrumbs';

// Capture - error reporting
export {
  addBreadcrumb,
  captureError,
  captureApiError,
  captureMessage,
  setTag,
  setContext,
  type LogLevel,
  type CaptureApiErrorOptions,
} from './capture';

// Tracing - performance monitoring
export { sentryTracingMiddleware } from './tracing';
