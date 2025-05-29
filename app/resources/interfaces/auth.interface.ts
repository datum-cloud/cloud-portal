export interface IAuthSession {
  accessToken: string
  idToken?: string
  refreshToken?: string | null
  expiredAt: Date
  sub?: string
}
