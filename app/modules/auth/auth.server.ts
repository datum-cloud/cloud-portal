import { commitAuthSession, getAuthSession } from './authSession.server'
import { routes } from '@/constants/routes'
import { IAuthSession, IOidcUser } from '@/resources/interfaces/auth.interface'
import { CustomError } from '@/utils/errorHandle'
import { redirect } from 'react-router'
import { Authenticator } from 'remix-auth'
import { OIDCStrategy } from 'remix-auth-openid'
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

authenticator.use(
  await OIDCStrategy.init<IAuthSession>(
    {
      issuer: process.env.AUTH_OIDC_ISSUER ?? 'http://localhost:3000',
      client_id: process.env.AUTH_OIDC_CLIENT_ID ?? '',
      client_secret: '',
      redirect_uris: [`${process.env.APP_URL}${routes.auth.callback}`],
      post_logout_redirect_uris: [`${process.env.APP_URL}${routes.auth.logIn}`],
      scopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
    },
    async ({ tokens }): Promise<IAuthSession> => {
      try {
        if (!tokens.id_token) {
          throw new CustomError('No id_token in response', 400)
        }

        if (!tokens.access_token) {
          throw new CustomError('No access_token in response', 400)
        }

        const profile = await fetchOauthProfile<IOidcUser>(
          `${process.env.AUTH_OIDC_ISSUER}/oidc/v1/userinfo`,
          tokens.access_token,
        )

        return {
          sub: profile.sub ?? '',
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token,
          expiredAt: tokens.expires_at ?? 0,
          user: profile,
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        throw new CustomError(error?.message ?? 'Failed to fetch user profile', 500)
      }
    },
  ),
  'oidc',
)

export async function isAuthenticated(
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean,
) {
  const session = await getAuthSession(request.headers.get('cookie'))
  const sessionData = session.get('session')

  if (!sessionData) {
    if (noAuthRedirect) {
      return redirect(safeRedirect(routes.auth.logIn), {
        headers: {
          'Set-Cookie': await commitAuthSession(session),
        },
      })
    }

    return null
  }

  if (redirectTo) {
    return redirect(safeRedirect(redirectTo), {
      headers: {
        'Set-Cookie': await commitAuthSession(session),
      },
    })
  }

  return true
}
