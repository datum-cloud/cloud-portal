import { createAxiosClient } from '@/modules/axios/axios'
import { AxiosInstance } from 'axios'

export const createAPIFactory = (authToken: string): AxiosInstance => {
  const apiClient = createAxiosClient({
    baseURL: `${process.env.API_URL}/datum-os`,
    authToken,
  })

  return apiClient
}

export type APIFactory = ReturnType<typeof createAPIFactory>
