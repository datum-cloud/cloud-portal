import { getRequestContext } from './request-context';
import { createUpstreamErrorHandler } from './upstream-error.server';
import { logger } from '@/modules/logger';
import { generateCurl } from '@/modules/logger/curl.generator';
import { LOGGER_CONFIG } from '@/modules/logger/logger.config';
import {
  isKubernetesResource,
  setSentryResourceContext,
  clearSentryResourceContext,
} from '@/modules/sentry';
import { recordUpstreamResponse } from '@/server/observability/upstream-metrics';
import { env } from '@/utils/env/env.server';
import Axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

/**
 * Server-side axios instance for SSR loaders and actions.
 * - Connects directly to API_URL (no proxy)
 * - Auto-injects Authorization header from AsyncLocalStorage
 * - Auto-injects X-Request-ID for tracing
 * - Forwards browser User-Agent from request context when set
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

  // Forward browser User-Agent for upstream audit logs
  if (ctx?.userAgent) {
    config.headers = config.headers || {};
    const headers = config.headers;
    const existing =
      typeof headers.get === 'function'
        ? headers.get('User-Agent')
        : (headers as { 'User-Agent'?: string })['User-Agent'];
    if (!existing) {
      if (typeof headers.set === 'function') {
        headers.set('User-Agent', ctx.userAgent);
      } else {
        (headers as { 'User-Agent': string })['User-Agent'] = ctx.userAgent;
      }
    }
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

  recordUpstreamResponse({
    method: config?.method,
    url: config?.url,
    status: response.status,
  });

  return response;
};

// Shared transform: metrics counting, K8s Status parsing, Sentry capture
// policy, typed AppError mapping (see upstream-error.server.ts).
const transformUpstreamError = createUpstreamErrorHandler();

/** Marks a request already re-issued with a rotated session, so it never loops. */
type RotationRetryConfig = InternalAxiosRequestConfig & { __rotationRetried?: boolean };

const BEARER_PREFIX = 'Bearer ';

/**
 * A 401 here usually means a concurrent refresh rotated the session while this
 * call was in flight: Zitadel revokes the old access token at once. Re-issue it
 * once with the session the rotation link points at. Returns undefined when
 * there is nothing to redeem, leaving the 401 to the normal path.
 */
async function retryWithRotatedSession(error: AxiosError): Promise<AxiosResponse | undefined> {
  const config = error.config as RotationRetryConfig | undefined;
  const ctx = getRequestContext();
  if (error.response?.status !== 401 || !config || config.__rotationRetried) return undefined;
  if (!ctx?.cookieHeader) return undefined;

  const authorization = config.headers?.get?.('Authorization');
  if (typeof authorization !== 'string' || !authorization.startsWith(BEARER_PREFIX)) {
    return undefined;
  }
  const usedToken = authorization.slice(BEARER_PREFIX.length);

  // Only a failure of the lookup falls through to the normal 401 path. Once
  // `call` has run, an error belongs to the retried request, which this same
  // interceptor already transformed, so it propagates as is.
  let called = false;
  try {
    // Loaded lazily so modules importing this file do not pull in the auth
    // module graph at load time.
    const { AuthService } = await import('@/utils/auth/auth.service');
    const retried = await AuthService.retryWithRotatedSession(
      ctx.cookieHeader,
      usedToken,
      'axios',
      (token) => {
        called = true;
        // Later calls on this request use the new token too.
        ctx.token = token;
        return http.request({ ...config, __rotationRetried: true } as RotationRetryConfig);
      }
    );
    if (!retried) return undefined;

    ctx.rotatedCookies = retried.headers;
    return retried.result;
  } catch (error) {
    if (called) throw error;
    return undefined;
  }
}

const onResponseError = async (error: AxiosError): Promise<AxiosResponse> => {
  // A failure of the retried request was already transformed by this same
  // interceptor, so it propagates as is.
  const retried = await retryWithRotatedSession(error);
  if (retried) return retried;

  const config = error.config as any;

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

  return transformUpstreamError(error);
};

http.interceptors.request.use(onRequest, onRequestError);
http.interceptors.response.use(onResponse, onResponseError);

// Register on globalThis for gqlts module to access
(globalThis as any).__axios_server_http__ = http;
