import {
  IAuthTokenPayload,
  IAuthTokenResponse,
  IExchangeTokenResponse,
} from '@/resources/interfaces/auth.interface'
import { IUserProfile } from '@/resources/interfaces/user.interface'
import { AxiosInstance } from 'axios'

export const authAPIService = (client: AxiosInstance) => {
  return {
    async postRegisterOauth(payload: IAuthTokenPayload): Promise<IAuthTokenResponse> {
      const response = await client.post('/oauth/register', payload)
      return response.data
    },
    async getUserInfo(): Promise<IUserProfile> {
      const response = await client.get('/oauth/userinfo')
      return response.data
    },
    async getExchangeToken(accessToken: string): Promise<IExchangeTokenResponse> {
      const response = await client.get('/oauth/token/exchange', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return response.data
    },
  }
}

export type AuthAPIService = ReturnType<typeof authAPIService>
