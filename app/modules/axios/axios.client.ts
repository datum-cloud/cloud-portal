import { toast } from '@datum-ui/components';
import * as Sentry from '@sentry/react-router';
import Axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

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
  timeout: 20_000,
  withCredentials: true,
});

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // Record start time for duration calculation
  (config as any).metadata = { startTime: Date.now() };
  return config;
};

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error);
};

const onResponse = (response: AxiosResponse): AxiosResponse => {
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

  // Capture to Sentry with context
  Sentry.captureException(error, {
    tags: {
      type: 'api_error',
      status: String(error.response?.status ?? 'network'),
    },
    extra: {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      requestId: errorInfo.requestId,
    },
  });

  // Show toast with error message
  const title = errorInfo.requestId ? `Request ID: ${errorInfo.requestId}` : 'Error';
  toast.error(title, { description: errorInfo.message });

  return Promise.reject(error);
};

httpClient.interceptors.request.use(onRequest, onRequestError);
httpClient.interceptors.response.use(onResponse, onResponseError);
