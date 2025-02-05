import { Authenticator } from 'remix-auth'
import {
  IGoogleProfile,
  IUser,
  IUserProfile,
} from '@/resources/interfaces/user.interface'
import { OAuth2Strategy } from 'remix-auth-oauth2'
import { getUserInfo, postRegisterOauth } from '@/resources/api/auth'
import { IAuthTokenResponse } from '@/resources/interfaces/auth.interface'
import { jwtDecode } from 'jwt-decode'
import { routes } from '@/constants/routes'
import { getSession, commitSession } from './auth-session.server'
import { redirect } from '@remix-run/node'

export const authenticator = new Authenticator<IUser>()

authenticator.use(
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
        const googleAccessToken = tokens.accessToken()

        // Fetch Google user profile using the access token
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch user profile: ${response.statusText}`)
        }

        const googleProfile: IGoogleProfile = await response.json()

        if (!googleProfile) {
          throw new Error('Failed to parse Google profile data')
        }

        // Register user in the database
        const data: IAuthTokenResponse = await postRegisterOauth({
          externalUserId: googleProfile.sub,
          email: googleProfile.email,
          name: googleProfile.name,
          image: googleProfile.picture,
          authProvider: 'google',
          clientToken: googleAccessToken,
        })

        if (!data.success) {
          throw new Error('Failed to register oauth')
        }

        // Fetch user info from the database
        const userInfo: IUserProfile = await getUserInfo(data.access_token)

        // TODO: Find a way to get organization info from the access token
        // Decode Access Token to get organization info
        const decoded: { org: string; user_id: string; user_entity_id: string } =
          jwtDecode(data.access_token)

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
      } catch (error) {
        console.error('Authentication failed', error)
        throw new Error('Authentication failed')
      }
    },
  ),
  'google',
)

// Finally, we need to export a loader function to check if the user is already
// authenticated and redirect them to the dashboard
export async function getUserSession(request: Request, redirectTo?: string) {
  const session = await getSession(request.headers.get('cookie'))
  const user = session.get('user')
  if (user) {
    if (redirectTo) {
      return redirect(redirectTo, {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      })
    }

    return user
  }

  return null
}
