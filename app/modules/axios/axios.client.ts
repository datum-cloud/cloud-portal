import { type K8sStatus, isK8sStatus, parseK8sStatusError } from './k8s-error';
import {
  isKubernetesResource,
  setSentryResourceContext,
  clearSentryResourceContext,
  captureApiError,
} from '@/modules/sentry';
import { AppError } from '@/utils/errors/app-error';
import * as Sentry from '@sentry/react-router';
import Axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

export const PROXY_URL = '/api/proxy';

/**
 * Client-side axios instance for React Query hooks.
 * - Routes through /api/proxy (session cookie auth)
 * - Handles 401 → redirect to logout
 * - Transforms errors into AppError objects with user-friendly messages
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

/** Serialized AppError shape (from Hono error handler) */
interface SerializedAppError {
  code: string;
  message: string;
  status: number;
  details?: Array<{ path: string[]; message: string; code?: string }>;
  requestId?: string;
}

function isSerializedAppError(data: unknown): data is SerializedAppError {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.code === 'string' &&
    typeof obj.status === 'number' &&
    typeof obj.message === 'string' &&
    !('kind' in obj) // Exclude K8s resources (they have 'kind' field)
  );
}

function appErrorFromK8sStatus(data: K8sStatus, httpStatus: number, cause: AxiosError): AppError {
  const parsed = parseK8sStatusError(data, httpStatus);
  return new AppError(parsed.message, {
    code: parsed.code,
    status: httpStatus,
    originalMessage: parsed.originalMessage,
    k8sReason: parsed.k8sReason,
    k8sDetails: parsed.k8sDetails,
    details: parsed.details,
    cause,
    captureToSentry: false,
  });
}

function appErrorFromSerialized(data: SerializedAppError, cause: AxiosError): AppError {
  return new AppError(data.message, {
    code: data.code,
    status: data.status,
    details: data.details,
    requestId: data.requestId,
    cause,
    captureToSentry: false,
  });
}

function appErrorFromRaw(error: AxiosError, httpStatus: number): AppError {
  const { message, requestId } = getErrorMessage(error);
  return new AppError(message, {
    code: 'API_ERROR',
    status: httpStatus,
    requestId,
    cause: error,
    captureToSentry: false,
  });
}

const onResponseError = (error: AxiosError): Promise<never> => {
  // Handle 401 AUTH_ERROR → redirect to logout
  if (error.response?.status === 401) {
    const data = error.response?.data as { code?: string } | undefined;
    if (data?.code === 'AUTH_ERROR' || data?.code === 'AUTHENTICATION_ERROR' || !data?.code) {
      window.location.href = '/logout';
      return Promise.reject(error);
    }
  }

  const responseData = error.response?.data;
  const httpStatus = error.response?.status ?? 500;

  const appError = isK8sStatus(responseData)
    ? appErrorFromK8sStatus(responseData, httpStatus, error)
    : isSerializedAppError(responseData)
      ? appErrorFromSerialized(responseData, error)
      : appErrorFromRaw(error, httpStatus);

  // Capture to Sentry
  captureApiError({
    error,
    method: error.config?.method,
    url: error.config?.url,
    status: error.response?.status ?? 'network',
    message: appError.originalMessage ?? appError.message,
    requestId: appError.requestId,
  });

  return Promise.reject(appError);
};

httpClient.interceptors.request.use(onRequest, onRequestError);
httpClient.interceptors.response.use(onResponse, onResponseError);

// Register on globalThis for gqlts module to access
(globalThis as any).__axios_client_http__ = httpClient;
