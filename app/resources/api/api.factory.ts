import { createAxiosClient } from '@/modules/axios/axios'
import { createAuthAPIService, AuthAPIService } from './auth.api'

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
