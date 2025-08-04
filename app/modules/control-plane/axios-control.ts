import { isDevelopment } from '@/utils/environment';
import { CustomError } from '@/utils/error';
import { Client, ClientOptions, createClient, createConfig } from '@hey-api/client-axios';
import { AxiosError } from 'axios';
import curlirize from 'axios-curlirize';

// Customize the client to add an auth token to the request headers
const errorHandler = (error: AxiosError) => {
  const errorMessage =
    (error.response?.data as any)?.message || error.message || 'Unknown error occurred';

  const errorResponse = new CustomError(errorMessage, error.response?.status || 500, error);

  return Promise.reject(errorResponse);
};

export const createControlPlaneClient = (
  options: ClientOptions & { authToken: string }
): Client => {
  const { authToken, baseURL } = options;

  const client = createClient(
    createConfig<ClientOptions>({
      baseURL,
      withCredentials: false,
      throwOnError: true,
    })
  );

  // Curlirize the client for debugging purposes
  if (isDevelopment()) {
    curlirize(client.instance);
  }

  client.instance.interceptors.request.use(
    (config: any) => {
      if (authToken) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${authToken}`,
        };
      }
      return config;
    },
    (error) => {
      return errorHandler(error);
    }
  );

  client.instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      return errorHandler(error);
    }
  );

  return client;
};
