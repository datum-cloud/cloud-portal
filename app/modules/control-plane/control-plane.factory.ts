import { AxiosCurlLibrary } from './axios-curl';
import { isDevelopment } from '@/utils/config/env.config';
import { AppError } from '@/utils/errors';
import { mapAxiosErrorToAppError } from '@/utils/errors/axios';
import { Client, ClientOptions, createClient, createConfig } from '@hey-api/client-axios';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

function defaultLogCallback(curlResult: any, err: any) {
  const { command } = curlResult;
  if (err) {
    console.error('Axios curl error', { error: err instanceof Error ? err.message : String(err) });
  } else {
    console.debug('Axios curl command', { command });
  }
}

const onRequest = (
  config: InternalAxiosRequestConfig,
  authToken?: string
): InternalAxiosRequestConfig => {
  // Add authorization header if available
  if (authToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Only log the curl command in development mode
  if (isDevelopment()) {
    try {
      const curl = new AxiosCurlLibrary(config);
      (config as any).curlObject = curl;
      (config as any).curlCommand = curl.generateCommand();
      (config as any).clearCurl = () => {
        delete (config as any).curlObject;
        delete (config as any).curlCommand;
        delete (config as any).clearCurl;
      };
    } catch (err) {
      // Even if the axios middleware is stopped, no error should occur outside.
      defaultLogCallback(null, err);
    } finally {
      if ((config as any).curlirize !== false) {
        defaultLogCallback(
          {
            command: (config as any).curlCommand,
            object: (config as any).curlObject,
          },
          null
        );
      }
    }
  }

  return config;
};

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  // console.error(`[request error] [${JSON.stringify(error)}]`);
  return Promise.reject(error);
};

const onResponse = (response: AxiosResponse): AxiosResponse => {
  if (isDevelopment()) {
    const path = response.config?.url || 'unknown';
    console.debug('API Request Success', {
      url: path,
      method: response.config?.method,
      status: response.status,
    });
  }
  return response;
};

const onResponseError = (error: AxiosError): Promise<AppError> => {
  const path = error.config?.url || 'unknown';
  const status = error.response?.status || 500;

  if (isDevelopment()) {
    console.debug('API Request Error', {
      url: path,
      method: error.config?.method,
      status,
      error: error.message,
      curl: (error.config as any)?.curlCommand,
    });
  }

  // Map to AppError and throw
  const appError = mapAxiosErrorToAppError(error);
  return Promise.reject(appError);
};

export const createControlPlaneClient = (authToken: string, baseUrl?: string): Client => {
  const httpControlPlane = createClient(
    createConfig<ClientOptions>({
      baseURL: baseUrl || process.env.API_URL,
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

export type ControlPlaneClient = ReturnType<typeof createControlPlaneClient>;
