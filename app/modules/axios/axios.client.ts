import {
  isKubernetesResource,
  setSentryResourceContext,
  clearSentryResourceContext,
  captureApiError,
} from '@/modules/sentry';
import * as Sentry from '@sentry/react-router';
import Axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const PROXY_URL = '/api/proxy';

/**
 * Client-side axios instance for React Query hooks.
 * - Routes through /api/proxy (session cookie auth)
 * - Handles 401 → redirect to logout
 * - Shows toast on errors
 * - Captures errors to Sentry
 */
export const httpClient = Axios.create({
  baseURL: PROXY_URL,
  timeout: 60_000, // 60 seconds
  withCredentials: true,
});

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // Clear previous resource context to avoid stale data
  clearSentryResourceContext();
  // Record start time for duration calculation
  (config as any).metadata = { startTime: Date.now() };
  return config;
};

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error);
};

const onResponse = (response: AxiosResponse): AxiosResponse => {
  const config = response.config as any;

  // Add API breadcrumb for user journey tracking
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${config.method?.toUpperCase()} ${config.url}`,
    level: 'info',
    data: {
      method: config.method,
      url: config.url,
      status: response.status,
      duration: config.metadata?.startTime ? Date.now() - config.metadata.startTime : undefined,
    },
  });

  // Set resource context if response is a K8s resource
  if (isKubernetesResource(response.data)) {
    setSentryResourceContext(response.data);
  }

  return response;
};

/**
 * Extract error message from various response formats.
 */
function getErrorMessage(error: AxiosError): { message: string; requestId?: string } {
  if (error.response?.data) {
    const data = error.response.data as Record<string, unknown>;

    // Handle string response
    if (typeof data === 'string') {
      return { message: data };
    }

    // Handle object response
    if (typeof data === 'object') {
      const requestId = data.requestId as string | undefined;

      // Common error response formats
      if (data.error && typeof data.error === 'string') {
        return { message: data.error, requestId };
      }
      if (data.message && typeof data.message === 'string') {
        return { message: data.message, requestId };
      }
      if (data.detail && typeof data.detail === 'string') {
        return { message: data.detail, requestId };
      }
      if (data.reason && typeof data.reason === 'string') {
        return { message: data.reason, requestId };
      }
    }
  }

  // Fallback to status text or generic message
  return {
    message: error.response?.statusText || error.message || 'An unexpected error occurred',
  };
}

const onResponseError = (error: AxiosError): Promise<AxiosError> => {
  // Handle 401 AUTH_ERROR → redirect to logout
  if (error.response?.status === 401) {
    const data = error.response?.data as { code?: string } | undefined;
    if (data?.code === 'AUTH_ERROR' || data?.code === 'AUTHENTICATION_ERROR' || !data?.code) {
      window.location.href = '/logout';
      return Promise.reject(error);
    }
  }

  const errorInfo = getErrorMessage(error);

  // Capture API error to Sentry with resource context and fingerprinting
  captureApiError({
    error,
    method: error.config?.method,
    url: error.config?.url,
    status: error.response?.status ?? 'network',
    message: errorInfo.message,
    requestId: errorInfo.requestId,
  });

  // Show toast with error message
  // const title = errorInfo.requestId ? `Request ID: ${errorInfo.requestId}` : 'Error';
  // toast.error(title, { description: errorInfo.message });

  return Promise.reject(error);
};

httpClient.interceptors.request.use(onRequest, onRequestError);
httpClient.interceptors.response.use(onResponse, onResponseError);

// Register on globalThis for gqlts module to access
(globalThis as any).__axios_client_http__ = httpClient;
