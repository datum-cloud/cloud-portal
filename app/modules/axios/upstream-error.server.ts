import { isK8sStatus, parseK8sStatusError } from './k8s-error';
import { getRequestContext } from './request-context';
import { UPSTREAM_ERROR_ATTACH_KEY } from './upstream-error-bridge';
import { captureApiError } from '@/modules/sentry';
import { recordUpstreamResponse } from '@/server/observability/upstream-metrics';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  isUserFacingErrorStatus,
  NotFoundError,
  ValidationError,
} from '@/utils/errors';
import { isAxiosError, type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';

/** Extract a fallback message from non-K8s response data. */
function resolveRawMessage(data: unknown, error: AxiosError): string {
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.reason === 'string') return obj.reason;
    if (typeof obj.error === 'string') return obj.error;
  }
  return error.message;
}

/**
 * The typed-error subclass constructors don't accept `cause`; attach the
 * original AxiosError so instance-specific wrappers (prometheus, cloudvalid)
 * can recover it via `unwrapUpstreamError`.
 */
function withCause<T extends Error>(err: T, cause: unknown): T {
  err.cause = cause;
  return err;
}

export type UpstreamErrorHandler = (error: unknown) => Promise<never>;

/**
 * Shared response-error transform for every server-side axios instance —
 * the single implementation of the upstream error policy:
 *
 * - counts the outcome in `portal_upstream_responses_total` (no-response
 *   network failures under status="network", never a fabricated "500")
 * - parses K8s Status bodies into user-friendly messages (degrades to the
 *   raw body message for non-K8s upstreams)
 * - captures unexpected statuses to Sentry via `captureApiError`; expected
 *   user-facing statuses (401/403/404/429) are never captured
 * - rethrows as typed AppErrors so raw AxiosErrors never escape
 *
 * Rejections that are not AxiosErrors (already transformed by an earlier
 * interceptor) pass through untouched.
 */
export function createUpstreamErrorHandler(): UpstreamErrorHandler {
  return async (error: unknown): Promise<never> => {
    if (!isAxiosError(error)) throw error;

    const requestId = getRequestContext()?.requestId;
    const method = error.config?.method;
    const url = error.config?.url;

    const responseData: unknown = error.response?.data;
    const httpStatus = error.response?.status ?? 500;

    // No-response failures (timeout/DNS/refused) are not upstream responses:
    // label them "network" so they never masquerade as real upstream 500s in
    // portal_upstream_responses_total.
    recordUpstreamResponse({ method, url, status: error.response ? httpStatus : 'network' });

    // Parse K8s Status for user-friendly message
    const parsed = isK8sStatus(responseData) ? parseK8sStatusError(responseData, httpStatus) : null;

    const message = parsed?.message ?? resolveRawMessage(responseData, error);

    // Capture API error to Sentry with resource context and fingerprinting.
    // Skip expected user-facing statuses (401/403/404/429) — these are not
    // bugs and are surfaced to the user via the route error boundary.
    if (!isUserFacingErrorStatus(httpStatus)) {
      captureApiError({
        error,
        method,
        url,
        status: httpStatus,
        message: parsed?.originalMessage ?? message,
        requestId,
      });
    }

    switch (httpStatus) {
      case 401: {
        const data = responseData as { error?: string; error_description?: string } | undefined;
        if (data?.error === 'access_denied' && data?.error_description === 'access token invalid') {
          throw withCause(new AuthenticationError('Session expired', requestId), error);
        }
        throw withCause(
          new AuthenticationError(message || 'Authentication required', requestId),
          error
        );
      }
      case 403: {
        // K8s Status: keep originalMessage/k8sReason/k8sDetails so quota 403s
        // remain classifiable (parity with the client interceptor), while
        // preserving AuthorizationError identity — many callers branch on
        // `instanceof AuthorizationError` (fraud retry, onboarding loaders,
        // fan-out skipping, billing degradation).
        if (parsed) {
          throw withCause(
            new AuthorizationError(message, requestId, {
              code: parsed.code,
              details: parsed.details,
              originalMessage: parsed.originalMessage,
              k8sReason: parsed.k8sReason,
              k8sDetails: parsed.k8sDetails,
            }),
            error
          );
        }
        throw withCause(new AuthorizationError(message || 'Permission denied', requestId), error);
      }
      case 404: {
        // K8s Status: use AppError with parsed message (e.g., 'DNS Zone "example" not found')
        // Non-K8s: NotFoundError constructs "Resource not found" from scratch
        if (parsed) {
          throw new AppError(message, {
            code: parsed.code,
            status: 404,
            requestId,
            cause: error,
            originalMessage: parsed.originalMessage,
            k8sReason: parsed.k8sReason,
            k8sDetails: parsed.k8sDetails,
            captureToSentry: false,
          });
        }
        throw withCause(new NotFoundError('Resource', undefined, requestId), error);
      }
      case 422: {
        throw withCause(
          new ValidationError(message || 'Validation failed', parsed?.details, requestId),
          error
        );
      }
      default: {
        // captureApiError above already owns the Sentry event (with resource
        // fingerprinting); letting AppError auto-capture on >=500 would send
        // a duplicate for every server 5xx / network failure.
        throw new AppError(message || 'An unexpected error occurred', {
          code: parsed?.code,
          status: httpStatus,
          requestId,
          cause: error,
          originalMessage: parsed?.originalMessage,
          k8sReason: parsed?.k8sReason,
          k8sDetails: parsed?.k8sDetails,
          details: parsed?.details,
          captureToSentry: false,
        });
      }
    }
  };
}

/**
 * Attach shared upstream response accounting + error typing to an axios
 * instance. Register this BEFORE any instance-specific interceptor so the
 * handler observes the raw AxiosError; downstream transforms can recover the
 * original failure with `unwrapUpstreamError`.
 */
export function attachUpstreamErrorHandling(instance: AxiosInstance): void {
  instance.interceptors.response.use((response: AxiosResponse): AxiosResponse => {
    recordUpstreamResponse({
      method: response.config?.method,
      url: response.config?.url,
      status: response.status,
    });
    return response;
  }, createUpstreamErrorHandler());
}

// Client-bundled modules (prometheus/cloudvalid clients) attach through this
// globalThis hook because they cannot import a .server module. Registered at
// module load — axios.server.ts imports this file and is itself loaded at
// server startup (entry.ts → control-plane setup.server), so the hook exists
// before any request-scoped client is created.
(globalThis as Record<string, unknown>)[UPSTREAM_ERROR_ATTACH_KEY] = attachUpstreamErrorHandling;
