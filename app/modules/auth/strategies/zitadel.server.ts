import type { IAuthSession } from '@/utils/auth';
import { paths } from '@/utils/config/paths.config';
import { env } from '@/utils/env/env.server';
import { AuthenticationError } from '@/utils/errors';
import 'dotenv/config';
import { OAuth2Strategy as OAuth2 } from 'remix-auth-oauth2';

export const zitadelIssuer = env.server.authOidcIssuer ?? 'http://localhost:3000';

/**
 * https://github.com/sergiodxa/remix-auth-oauth2?tab=readme-ov-file#discovering-the-provider
 * This will fetch the provider's configuration endpoint (/.well-known/openid-configuration)
 * and grab the authorization, token and revocation endpoints from it,
 * it will also grab the code challenge method supported and try to use S256 if it is supported.
 * Remember this will do a fetch when then strategy is created, this will add a latency to the startup of your application. */
export const zitadelStrategy = await OAuth2.discover<IAuthSession>(
  zitadelIssuer,
  {
    clientId: env.server.authOidcClientId ?? '',
    clientSecret: '',
    redirectURI: `${env.public.appUrl ?? 'http://localhost:3000'}${paths.auth.callback}`,
    scopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
    // codeChallengeMethod: CodeChallengeMethod.S256,
  },
  async ({ tokens }) => {
    try {
      if (!tokens.idToken()) {
        throw new AuthenticationError('No id_token in response');
      }

      if (!tokens.accessToken()) {
        throw new AuthenticationError('No access_token in response');
      }

      // Get User

      return {
        idToken: tokens.idToken(),
        accessToken: tokens.accessToken(),
        refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
        expiredAt: tokens.accessTokenExpiresAt(),
      };
    } catch (error: any) {
      throw new AuthenticationError(error?.message ?? 'Failed to fetch user profile');
    }
  }
);
