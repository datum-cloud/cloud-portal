import { isDevelopment } from '@/utils/environment';
import { CustomError } from '@/utils/error';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import curlirize from 'axios-curlirize';

const errorHandler = (error: AxiosError) => {
  const errorMessage =
    (error.response?.data as any)?.message || error.message || 'Unknown error occurred';

  const errorResponse = new CustomError(errorMessage, error.response?.status || 500, error);

  return Promise.reject(errorResponse);
};

export const createAxiosClient = (options: AxiosRequestConfig): AxiosInstance => {
  const instance = axios.create({
    withCredentials: false,
    ...options,
  });

  // Curlirize the client for debugging purposes
  if (isDevelopment()) {
    curlirize(instance);
  }

  instance.interceptors.request.use(
    (config: any) => {
      return config;
    },
    (error) => {
      return errorHandler(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      return errorHandler(error);
    }
  );

  return instance;
};
