import { IUser } from './user.interface'

export interface IAuthSession {
  sub?: string
  accessToken: string
  idToken?: string
  refreshToken?: string
  expiredAt: number
  user?: IUser
}
