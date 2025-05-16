import { IUser } from './user.interface'
import { OIDCStrategy } from 'remix-auth-openid'

export interface IAuthSession extends OIDCStrategy.BaseUser {
  user?: IUser
}
