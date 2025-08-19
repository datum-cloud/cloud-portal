import { AxiosCurlLibrary } from '@/modules/axios/axios-curl';
import { env } from '@/utils/configs/env.server';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  HttpError,
} from '@/utils/errors';
import { Client, ClientOptions, createClient, createConfig } from '@hey-api/client-axios';
import { AsyncLocalStorage } from 'async_hooks';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// AsyncLocalStorage to store request context
const requestContext = new AsyncLocalStorage<{ requestId?: string }>();

// Helper to get current request ID
function getCurrentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

function defaultLogCallback(curlResult: any, err: any) {
  const { command } = curlResult;
  if (err) {
    console.error('Axios curl error', { error: err instanceof Error ? err.message : String(err) });
  } else {
    console.debug('Axios curl command', { command });
  }
  /* if (err) {
    logger.error('Axios curl error', { error: err instanceof Error ? err.message : String(err) });
  } else {
    logger.debug('Axios curl command', { command });
  } */
}

const onRequest = (
  config: InternalAxiosRequestConfig,
  authToken?: string
): InternalAxiosRequestConfig => {
  // console.info(`[request] [${JSON.stringify(config)}]`);

  // Automatically add request ID to headers if available in current context
  const requestId = getCurrentRequestId();
  if (requestId) {
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = requestId;
  }

  // Add authorization header if available
  if (authToken) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }

  // Only log the curl command in development mode
  if (env.isDev) {
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
  // console.info(`[response] [${JSON.stringify(response)}]`);
  return response;
};

const onResponseError = (error: AxiosError): Promise<AxiosError> => {
  // console.error(`[response error] [${JSON.stringify(error)}]`);

  // Get requestId from AsyncLocalStorage
  const requestId = getCurrentRequestId();

  // Log the API request error with consistent format
  if (requestId) {
    console.error('API Request Error', {
      requestId,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
    });
    /* logger.error('API Request Error', {
      requestId,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      error: error.message,
    }); */
  }

  // this error mostly comes from API server
  switch (error.response?.status) {
    case 401: {
      const data = error.response?.data as {
        error: string;
        error_description: string;
      };
      if (data.error === 'access_denied' && data.error_description === 'access token invalid') {
        const authError = new AuthenticationError('Session expired', requestId);
        throw authError.toResponse();
      }
    }
    case 403: {
      const data = error.response?.data as { message: string; reason: string };
      const authError = new AuthorizationError(
        data?.message ?? 'Not authorized to perform this action',
        requestId
      );
      throw authError.toResponse();
    }
    case 404: {
      const notFoundError = new NotFoundError('Resource not found', requestId);
      throw notFoundError.toResponse();
    }
    case 422: {
      const data = error.response?.data as { message: string; reason: string };
      const validationError = new ValidationError(data.message, requestId);
      throw validationError.toResponse();
    }
    default: {
      const httpError = new HttpError(
        'An unexpected error occurred',
        error.response?.status,
        requestId
      );
      throw httpError.toResponse();
    }
  }
};

export const createControlPlaneFactory = (authToken: string, baseUrl?: string): Client => {
  const httpControlPlane = createClient(
    createConfig<ClientOptions>({
      baseURL: baseUrl || env.API_URL,
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

export type ControlPlaneFactory = ReturnType<typeof createControlPlaneFactory>;
