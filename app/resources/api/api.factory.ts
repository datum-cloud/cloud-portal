import { AuthAPIService, createAuthAPIService } from './auth.api'
import { createAxiosClient } from '@/modules/axios/axios'

export interface APIFactory {
  authApi: AuthAPIService
}

export const createAPIFactory = (authToken: string): APIFactory => {
  const apiClient = createAxiosClient({
    baseURL: `${process.env.API_URL}/datum-os`,
    authToken,
  })

  return {
    authApi: createAuthAPIService(apiClient),
  }
}
