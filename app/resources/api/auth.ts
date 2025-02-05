import { api } from '@/modules/api/api'
import {
  IAuthTokenPayload,
  IAuthTokenResponse,
} from '@/resources/interfaces/auth.interface'
import { IUserProfile } from '@/resources/interfaces/user.interface'
async function postRegisterOauth(payload: IAuthTokenPayload) {
  const { data } = await api.post<IAuthTokenResponse>('/oauth/register', payload)

  return data
}

async function getUserInfo(token: string) {
  const { data } = await api.get<IUserProfile>('/oauth/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return data
}

export { postRegisterOauth, getUserInfo }
