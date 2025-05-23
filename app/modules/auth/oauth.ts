import { routes } from '@/constants/routes'
import { authAPI } from '@/resources/api/auth.api'
import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { IUser } from '@/resources/interfaces/user.interface'
import { CustomError } from '@/utils/errorHandle'
import { OAuth2Strategy as OAuth2 } from 'remix-auth-oauth2'

const issuer = process.env.AUTH_OIDC_ISSUER ?? 'http://localhost:3000'

/**
 * https://github.com/sergiodxa/remix-auth-oauth2?tab=readme-ov-file#discovering-the-provider
 * This will fetch the provider's configuration endpoint (/.well-known/openid-configuration)
 * and grab the authorization, token and revocation endpoints from it,
 * it will also grab the code challenge method supported and try to use S256 if it is supported.
 * Remember this will do a fetch when then strategy is created, this will add a latency to the startup of your application. */
export const OAuth2Strategy = await OAuth2.discover<IAuthSession>(
  issuer,
  {
    clientId: process.env.AUTH_OIDC_CLIENT_ID ?? '',
    clientSecret: '',
    redirectURI: `${process.env.APP_URL}${routes.auth.callback}`,
    scopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
    // codeChallengeMethod: CodeChallengeMethod.S256,
  },
  async ({ tokens }) => {
    try {
      /* if (!tokens.idToken()) {
        throw new CustomError('No id_token in response', 400)
      } */

      if (!tokens.accessToken()) {
        throw new CustomError('No access_token in response', 400)
      }

      const profile = await authAPI().getOAuthUser<IUser>(
        `${issuer}/oidc/v1/userinfo`,
        tokens.accessToken(),
      )

      return {
        // sub: profile.sub ?? '',
        // idToken: tokens.idToken(),
        accessToken: tokens.accessToken(),
        refreshToken: tokens.refreshToken() || undefined,
        expiredAt: tokens.accessTokenExpiresAt().getTime(), // Convert Date to number (timestamp)
        user: profile,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new CustomError(error?.message ?? 'Failed to fetch user profile', 500)
    }
  },
)
