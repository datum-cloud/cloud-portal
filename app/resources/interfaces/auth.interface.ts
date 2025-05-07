import { OIDCStrategy } from 'remix-auth-openid'

export interface IAuthTokenPayload {
  externalUserId: string
  email: string
  name: string
  image: string
  authProvider: string
  clientToken: string
}

export interface IAuthTokenResponse {
  success: boolean
  access_token: string
  refresh_token: string
  session: string
  token_type: string
}

export interface IOidcUser {
  sub?: string
  name?: string
  given_name?: string
  family_name?: string
  locale?: string
  updated_at?: number
  preferred_username?: string
  email?: string
  email_verified?: boolean
}
export interface IAuthSession extends OIDCStrategy.BaseUser {
  user: IOidcUser
}

export interface IExchangeTokenResponse {
  success: boolean
  access_token: string
  token_type: string
}
