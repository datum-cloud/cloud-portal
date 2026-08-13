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

const onResponseError = (error: AxiosError): Promise<never> => {
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
