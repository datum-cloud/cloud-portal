// app/modules/control-plane/control-plane.factory.ts
import { AxiosCurlLibrary } from './axios-curl';
import { logger as rootLogger } from '@/modules/logger';
import { LOGGER_CONFIG } from '@/modules/logger/logger.config';
import { env } from '@/utils/env';
import { AppError } from '@/utils/errors';
import { mapAxiosErrorToAppError } from '@/utils/errors/axios';
import { Client, ClientOptions, createClient, createConfig } from '@hey-api/client-axios';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const onRequest = (
  config: InternalAxiosRequestConfig,
  authToken?: string
): InternalAxiosRequestConfig => {
  // Add authorization header if available
  if (authToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Record start time for duration calculation
  (config as any).metadata = { startTime: Date.now() };

  // Generate curl command if enabled
  if (LOGGER_CONFIG.logCurl) {
    try {
      const curl = new AxiosCurlLibrary(config);
      (config as any).curlCommand = curl.generateCommand();
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

  // Only log API calls if enabled (disabled on client in production)
  if (LOGGER_CONFIG.logApiCalls) {
    const method = config?.method?.toUpperCase() || 'GET';
    const url = config?.url || 'unknown';
    const duration = config?.metadata?.startTime
      ? Date.now() - config.metadata.startTime
      : undefined;

    rootLogger.api({
      method,
      url,
      status: response.status,
      duration,
      curl: config?.curlCommand,
    });
  }

  return response;
};

const onResponseError = (error: AxiosError): Promise<AppError> => {
  const config = error.config as any;

  // Only log API errors if enabled (disabled on client in production)
  if (LOGGER_CONFIG.logApiCalls) {
    const method = config?.method?.toUpperCase() || 'GET';
    const url = config?.url || 'unknown';
    const status = error.response?.status || 500;

    rootLogger.apiError({
      method,
      url,
      status,
      error: error as Error,
      curl: config?.curlCommand,
    });
  }

  // Map to AppError and throw
  const appError = mapAxiosErrorToAppError(error);
  return Promise.reject(appError);
};

export const createControlPlaneClient = (authToken: string, baseUrl?: string): Client => {
  const httpControlPlane = createClient(
    createConfig<ClientOptions>({
      baseURL: baseUrl || env.public.apiUrl,
      withCredentials: false,
      throwOnError: true,
    })
  );

  httpControlPlane.instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => onRequest(config, authToken),
    onRequestError
  );
  httpControlPlane.instance.interceptors.response.use(onResponse, onResponseError);

  return httpControlPlane;
};

/**
 * Creates a user-scoped control plane client.
 */
export const createUserScopedControlPlaneClient = (authToken: string, userId: string): Client => {
  const baseUrl = `${env.public.apiUrl}/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane`;
  return createControlPlaneClient(authToken, baseUrl);
};

export type ControlPlaneClient = ReturnType<typeof createControlPlaneClient>;
