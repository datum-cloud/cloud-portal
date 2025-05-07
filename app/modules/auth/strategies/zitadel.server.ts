import { routes } from '@/constants/routes'
import { IAuthSession } from '@/resources/interfaces/auth.interface'
import { CustomError } from '@/utils/errorHandle'
import { OAuth2Strategy as OAuth2 } from 'remix-auth-oauth2'

export const zitadelIssuer = process.env.AUTH_OIDC_ISSUER ?? 'http://localhost:3000'

/**
 * https://github.com/sergiodxa/remix-auth-oauth2?tab=readme-ov-file#discovering-the-provider
 * This will fetch the provider's configuration endpoint (/.well-known/openid-configuration)
 * and grab the authorization, token and revocation endpoints from it,
 * it will also grab the code challenge method supported and try to use S256 if it is supported.
 * Remember this will do a fetch when then strategy is created, this will add a latency to the startup of your application. */
export const zitadelStrategy = await OAuth2.discover<IAuthSession>(
  zitadelIssuer,
  {
    clientId: process.env.AUTH_OIDC_CLIENT_ID ?? '',
    clientSecret: '',
    redirectURI: `${process.env.APP_URL ?? 'http://localhost:3000'}${routes.auth.callback}`,
    scopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
    // codeChallengeMethod: CodeChallengeMethod.S256,
  },
  async ({ tokens }) => {
    try {
      if (!tokens.idToken()) {
        throw new CustomError('No id_token in response', 400)
      }

      if (!tokens.accessToken()) {
        throw new CustomError('No access_token in response', 400)
      }

      return {
        idToken: tokens.idToken(),
        accessToken: tokens.accessToken(),
        refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
        expiredAt: tokens.accessTokenExpiresAt(),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      throw new CustomError(error?.message ?? 'Failed to fetch user profile', 500)
    }
  },
)
