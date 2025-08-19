import { AxiosCurlLibrary } from './axios-curl';
import { env } from '@/utils/configs/env.server';
import {
  AuthenticationError,
  AuthorizationError,
  HttpError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors';
import { AsyncLocalStorage } from 'async_hooks';
import Axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { z } from 'zod';

// AsyncLocalStorage to store request context
const requestContext = new AsyncLocalStorage<{ requestId?: string }>();

// Helper to get current request ID
function getCurrentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// Helper to run code with request context
export function withRequestContext<T>(requestId: string, fn: () => T): T {
  return requestContext.run({ requestId }, fn);
}

export const http = Axios.create({
  timeout: 20 * 1000,
  baseURL: env.API_URL,
});

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

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // console.info(`[request] [${JSON.stringify(config)}]`);

  // Automatically add request ID to headers if available in current context
  const requestId = getCurrentRequestId();
  if (requestId) {
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = requestId;
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

http.interceptors.request.use(onRequest, onRequestError);
http.interceptors.response.use(onResponse, onResponseError);

interface RequestBuilder<TInput = unknown, TOutput = unknown> {
  input<T>(schema: z.ZodType<T>): RequestBuilder<T, TOutput>;
  output<T>(schema: z.ZodType<T>): RequestBuilder<TInput, T>;
  execute(): Promise<TOutput>;
}

export const apiRequest = (config: AxiosRequestConfig): RequestBuilder => {
  let inputSchema: z.ZodType | undefined;
  let outputSchema: z.ZodType | undefined;

  return {
    input(schema) {
      inputSchema = schema;
      return this as any;
    },
    output(schema) {
      outputSchema = schema;
      return this as any;
    },
    async execute() {
      if (inputSchema && config.data) {
        config.data = inputSchema.parse(config.data);
      }

      const response = await http(config);

      // if (outputSchema) {
      //   return outputSchema.parse(response.data);
      // }

      return response.data;
    },
  };
};
