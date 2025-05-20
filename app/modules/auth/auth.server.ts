import { getAuthSession, setAuthSession } from '../cookie/auth.server'
import { OAuth2Strategy } from './oauth'
import { routes } from '@/constants/routes'
import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { redirect } from 'react-router'
import { Authenticator } from 'remix-auth'
import { safeRedirect } from 'remix-utils/safe-redirect'

export const authenticator = new Authenticator<IAuthSession>()

// Register the OAuth2 strategy with the authenticator
authenticator.use(OAuth2Strategy, 'oauth2')

export async function isAuthenticated(
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean,
) {
  const { session, headers } = await getAuthSession(request)
  let currentHeaders = headers

  if (!session) {
    if (noAuthRedirect) {
      return redirect(safeRedirect(routes.auth.logIn), {
        headers: currentHeaders,
      })
    }

    // Generate a new request without search params
    const url = new URL(request.url)
    url.search = ''

    // Redirect to OIDC Page
    return authenticator.authenticate('oauth2', new Request(url.toString(), request))
  } else {
    // Check the session expired
    // if expired return to logout page
    if (new Date(session.expiredAt) < new Date()) {
      return redirect(safeRedirect(routes.auth.logOut), {
        headers: currentHeaders,
      })
    }

    // Refresh the token
    if (session.refreshToken) {
      try {
        const refreshSession = await OAuth2Strategy.refreshToken(session.refreshToken)

        const { headers: authHeaders } = await setAuthSession(request, {
          accessToken: refreshSession.accessToken(),
          refreshToken: refreshSession.refreshToken(),
          expiredAt: refreshSession.accessTokenExpiresAt().getTime(),
          // sub: refreshSession.sub(),
          // idToken: refreshSession.idToken(),
        })

        currentHeaders = authHeaders
      } catch (error) {
        console.log('Refresh token failed', error)
      }
    }

    if (redirectTo) {
      return redirect(safeRedirect(redirectTo), { headers: currentHeaders })
    }

    return true
  }
}
