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

export interface IAuthSession {
  userId: string
  accessToken: string
  refreshToken?: string
  userEntityId: string
}
