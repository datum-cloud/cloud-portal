import {
  IAuthTokenPayload,
  IAuthTokenResponse,
} from '@/resources/interfaces/auth.interface'
import { IUserProfile } from '@/resources/interfaces/user.interface'
import { AxiosClient } from '@/modules/axios/axios'

export class AuthApi extends AxiosClient {
  async postRegisterOauth(payload: IAuthTokenPayload): Promise<IAuthTokenResponse> {
    const { data } = await this.publicRequest('/oauth/register', 'POST', payload)
    return data
  }

  async getUserInfo(request: Request): Promise<IUserProfile> {
    await this.setToken(request)
    const { data } = await this.authClient('/oauth/userinfo', 'GET')
    return data
  }
}

export const authApi = new AuthApi()
