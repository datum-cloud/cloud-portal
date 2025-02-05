import { Authenticator } from 'remix-auth'
import {
  IGoogleProfile,
  IUser,
  IGithubProfile,
} from '@/resources/interfaces/user.interface'
import { OAuth2Strategy } from 'remix-auth-oauth2'
import { getUserInfo, postRegisterOauth } from '@/resources/api/auth'
import { jwtDecode } from 'jwt-decode'
import { routes } from '@/constants/routes'
import { getSession, commitSession } from './auth-session.server'
import { redirect } from '@remix-run/node'
import { GitHubStrategy } from 'remix-auth-github'

export const authenticator = new Authenticator<IUser>()

interface DecodedToken {
  org: string
  user_id: string
  user_entity_id: string
}

async function fetchOauthProfile<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`)
  }

  const profile = await response.json()
  if (!profile) {
    throw new Error('Failed to parse profile data')
  }

  return profile
}

async function handleOAuthFlow(
  accessToken: string,
  authProvider: 'google' | 'github',
  profile: IGoogleProfile | IGithubProfile,
) {
  const payload = {
    externalUserId: 'id' in profile ? String(profile.id) : profile.sub,
    email: profile.email,
    name: profile.name,
    image: 'picture' in profile ? profile.picture : profile.avatar_url,
    authProvider,
    clientToken: accessToken,
  }

  const data = await postRegisterOauth(payload)
  if (!data.success) {
    throw new Error('Failed to register oauth')
  }

  const userInfo = await getUserInfo(data.access_token)
  const decoded = jwtDecode<DecodedToken>(data.access_token)

  return {
    id: userInfo.id,
    email: userInfo.email,
    fullName: `${userInfo.first_name} ${userInfo.last_name}`,
    firstName: userInfo.first_name,
    lastName: userInfo.last_name,
    avatar: userInfo.avatar_remote_url,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    internal: userInfo.internal,
    sub: userInfo.sub,
    userId: decoded.user_id,
    userEntityId: decoded.user_entity_id,
    organization: decoded.org,
  }
}

authenticator
  .use(
    new OAuth2Strategy(
      {
        clientId: process.env.AUTH_GOOGLE_ID ?? '',
        clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
        redirectURI: `${process.env.APP_URL ?? 'http://localhost:3000'}${routes.auth.callback('google')}`,
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        scopes: ['email', 'profile', 'openid'],
      },
      async ({ tokens }) => {
        try {
          const accessToken = tokens.accessToken()
          const profile = await fetchOauthProfile<IGoogleProfile>(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            accessToken,
          )
          return handleOAuthFlow(accessToken, 'google', profile)
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : 'Authentication failed',
          )
        }
      },
    ),
    'google',
  )
  .use(
    new GitHubStrategy(
      {
        clientId: process.env.AUTH_GITHUB_ID ?? '',
        clientSecret: process.env.AUTH_GITHUB_SECRET ?? '',
        redirectURI: `${process.env.APP_URL ?? 'http://localhost:3000'}${routes.auth.callback('github')}`,
      },
      async ({ tokens }) => {
        try {
          const accessToken = tokens.accessToken()
          const profile = await fetchOauthProfile<IGithubProfile>(
            'https://api.github.com/user',
            accessToken,
          )
          return handleOAuthFlow(accessToken, 'github', profile)
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : 'Authentication failed',
          )
        }
      },
    ),
    'github',
  )

export async function getUserSession(request: Request, redirectTo?: string) {
  const session = await getSession(request.headers.get('cookie'))
  const user = session.get('user')

  if (!user) return null

  if (redirectTo) {
    return redirect(redirectTo, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }

  return user
}
