import { createAxiosClient } from '@/modules/axios/axios';
import { env } from '@/utils/config/env.server';
import { AxiosInstance } from 'axios';

export const createAPIFactory = (authToken: string): AxiosInstance => {
  let headers = {};
  if (authToken) {
    headers = {
      Authorization: `Bearer ${authToken}`,
    };
  }

  const apiClient = createAxiosClient({
    baseURL: `${env.API_URL}/datum-os`,
    headers,
  });

  return apiClient;
};

export type APIFactory = ReturnType<typeof createAPIFactory>;
