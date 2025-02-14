import { Authenticator } from 'remix-auth'
import { IGoogleProfile, IGithubProfile } from '@/resources/interfaces/user.interface'
import { OAuth2Strategy } from 'remix-auth-oauth2'
import { routes } from '@/constants/routes'
import { getSession, commitSession } from './auth-session.server'
import { redirect } from 'react-router'
import { GitHubStrategy } from 'remix-auth-github'
import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { jwtDecode } from 'jwt-decode'
import { safeRedirect } from 'remix-utils/safe-redirect'

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

    // Register the user
    const register = await fetch(`${process.env.API_URL}/datum-os/oauth/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!register.ok) {
      throw new Error('Failed to register oauth')
    }

    const data = await register.json()
    const decoded = jwtDecode<{ org: string; user_id: string; user_entity_id: string }>(
      data.access_token,
    )

    return {
      userId: decoded.user_id,
      userEntityId: decoded.user_entity_id,
      accessToken: data.access_token,
      defaultOrgId: decoded.org,
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to register oauth')
  }
}

authenticator
  .use(
    new OAuth2Strategy(
      {
        cookie: {
          name: 'oauth2',
          maxAge: 60 * 60 * 24 * 1, // 1 day
          path: '/auth',
          httpOnly: true,
          sameSite: 'Lax',
        },
        clientId: process.env.AUTH_GOOGLE_ID ?? '',
        clientSecret: process.env.AUTH_GOOGLE_SECRET ?? '',
        redirectURI: `${process.env.APP_URL ?? 'http://localhost:3000'}${routes.auth.callback('google')}`,
        authorizationEndpoint:
          'https://accounts.google.com/o/oauth2/v2/auth?prompt=login&response_type=code',
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

export async function isAuthenticated(
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean,
) {
  const session = await getSession(request.headers.get('cookie'))
  const accessToken = session.get('accessToken')

  if (!accessToken) {
    if (noAuthRedirect) {
      return redirect(safeRedirect(routes.auth.signIn), {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      })
    }

    return null
  }

  if (redirectTo) {
    return redirect(safeRedirect(redirectTo), {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    })
  }

  return true
}
