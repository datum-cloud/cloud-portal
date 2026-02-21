import { isK8sStatus, parseK8sStatusError } from './k8s-error';
import { getRequestContext } from './request-context';
import { logger } from '@/modules/logger';
import { generateCurl } from '@/modules/logger/curl.generator';
import { LOGGER_CONFIG } from '@/modules/logger/logger.config';
import {
  isKubernetesResource,
  setSentryResourceContext,
  clearSentryResourceContext,
  captureApiError,
} from '@/modules/sentry';
import { env } from '@/utils/env/env.server';
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors';
import Axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Server-side axios instance for SSR loaders and actions.
 * - Connects directly to API_URL (no proxy)
 * - Auto-injects Authorization header from AsyncLocalStorage
 * - Auto-injects X-Request-ID for tracing
 */
export const http = Axios.create({
  baseURL: env.public.apiUrl,
  timeout: 60_000, // 60 seconds
});

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // Clear previous resource context to avoid stale data
  clearSentryResourceContext();

  const ctx = getRequestContext();

  // Auto-inject Authorization header from context
  if (ctx?.token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${ctx.token}`;
  }

  // Auto-inject X-Request-ID for tracing
  if (ctx?.requestId) {
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = ctx.requestId;
  }

  // Replace /users/me/ with actual user ID from context
  // This allows services to use /users/me/ convention without knowing the user ID
  if (config.url && ctx?.userId && config.url.includes('/users/me/')) {
    config.url = config.url.replace('/users/me/', `/users/${ctx.userId}/`);
  }

  // Record start time for duration calculation
  (config as any).metadata = { startTime: Date.now() };

  // Generate curl command in development
  if (LOGGER_CONFIG.logCurl) {
    try {
      (config as any).curlCommand = generateCurl(config);
    } catch {
      // Silently ignore curl generation errors
    }
  }

  return config;
};

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error);
};

const onResponse = (response: AxiosResponse): AxiosResponse => {
  const config = response.config as any;

  // Log API calls if enabled
  if (LOGGER_CONFIG.logApiCalls) {
    const method = config?.method?.toUpperCase() || 'GET';
    const url = config?.url || 'unknown';
    const duration = config?.metadata?.startTime
      ? Date.now() - config.metadata.startTime
      : undefined;

    logger.api({
      method,
      url,
      status: response.status,
      duration,
      curl: config?.curlCommand,
    });
  }

  // Set resource context if response is a K8s resource
  if (isKubernetesResource(response.data)) {
    setSentryResourceContext(response.data);
  }

  return response;
};

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

const onResponseError = (error: AxiosError): Promise<never> => {
  const config = error.config as any;
  const ctx = getRequestContext();
  const requestId = ctx?.requestId;

  // Log API errors if enabled
  if (LOGGER_CONFIG.logApiCalls) {
    const method = config?.method?.toUpperCase() || 'GET';
    const url = config?.url || 'unknown';
    const status = error.response?.status || 500;

    logger.apiError({
      method,
      url,
      status,
      error: error as Error,
      curl: config?.curlCommand,
    });
  }

  const responseData = error.response?.data;
  const httpStatus = error.response?.status ?? 500;

  // Parse K8s Status for user-friendly message
  const parsed = isK8sStatus(responseData) ? parseK8sStatusError(responseData, httpStatus) : null;

  const message = parsed?.message ?? resolveRawMessage(responseData, error);

  // Capture API error to Sentry with resource context and fingerprinting
  captureApiError({
    error,
    method: config?.method,
    url: config?.url,
    status: httpStatus,
    message: parsed?.originalMessage ?? message,
    requestId,
  });

  switch (httpStatus) {
    case 401: {
      const data = responseData as { error?: string; error_description?: string } | undefined;
      if (data?.error === 'access_denied' && data?.error_description === 'access token invalid') {
        throw new AuthenticationError('Session expired', requestId);
      }
      throw new AuthenticationError(message || 'Authentication required', requestId);
    }
    case 403: {
      throw new AuthorizationError(message || 'Permission denied', requestId);
    }
    case 404: {
      // K8s Status: use AppError with parsed message (e.g., 'DNS Zone "example" not found')
      // Non-K8s: NotFoundError constructs "Resource not found" from scratch
      if (parsed) {
        throw new AppError(message, {
          code: parsed.code,
          status: 404,
          requestId,
          originalMessage: parsed.originalMessage,
          k8sReason: parsed.k8sReason,
          k8sDetails: parsed.k8sDetails,
          captureToSentry: false,
        });
      }
      throw new NotFoundError('Resource', undefined, requestId);
    }
    case 422: {
      throw new ValidationError(message || 'Validation failed', parsed?.details, requestId);
    }
    default: {
      throw new AppError(message || 'An unexpected error occurred', {
        code: parsed?.code,
        status: httpStatus,
        requestId,
        originalMessage: parsed?.originalMessage,
        k8sReason: parsed?.k8sReason,
        k8sDetails: parsed?.k8sDetails,
        details: parsed?.details,
      });
    }
  }
};

http.interceptors.request.use(onRequest, onRequestError);
http.interceptors.response.use(onResponse, onResponseError);

// Register on globalThis for gqlts module to access
(globalThis as any).__axios_server_http__ = http;
