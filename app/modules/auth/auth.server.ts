import { Authenticator } from 'remix-auth'
import { IGoogleProfile, IGithubProfile } from '@/resources/interfaces/user.interface'
import { OAuth2Strategy } from 'remix-auth-oauth2'
import { routes } from '@/constants/routes'
import { getSession, commitSession } from './auth-session.server'
import { redirect } from 'react-router'
import { GitHubStrategy } from 'remix-auth-github'
import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { authApi } from '@/resources/api/auth'
import { jwtDecode } from 'jwt-decode'
export const authenticator = new Authenticator<IAuthSession>()

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
  try {
    const payload = {
      externalUserId: 'id' in profile ? String(profile.id) : profile.sub,
      email: profile.email,
      name: profile.name,
      image: 'picture' in profile ? profile.picture : profile.avatar_url,
      authProvider,
      clientToken: accessToken,
    }

    const data = await authApi.postRegisterOauth(payload)
    if (!data.success) {
      throw new Error('Failed to register oauth')
    }

    // const userInfo = await getUserInfo(data.access_token)
    const decoded = jwtDecode<{ org: string; user_id: string; user_entity_id: string }>(
      data.access_token,
    )

    return {
      userId: decoded.user_id,
      userEntityId: decoded.user_entity_id,
      accessToken: data.access_token,
    }
  } catch (error) {
    console.log(error)
    throw new Error('Failed to register oauth')
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

export async function getCredentials(
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean,
) {
  const session = await getSession(request.headers.get('cookie'))
  const credentials = session.get('credentials')

  if (!credentials) {
    if (noAuthRedirect) {
      return redirect(routes.auth.signIn, {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      })
    }

    return null
  }

  if (redirectTo) {
    return redirect(redirectTo, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }

  return credentials
}
