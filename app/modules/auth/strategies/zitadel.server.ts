import type { IAuthSession } from '@/utils/auth';
import { paths } from '@/utils/config/paths.config';
import { env } from '@/utils/env/env.server';
import { AuthenticationError } from '@/utils/errors';
import { OAuth2Strategy as OAuth2 } from 'remix-auth-oauth2';
import { Strategy } from 'remix-auth/strategy';

export const zitadelIssuer = env.public.authOidcIssuer ?? 'http://localhost:3000';

const verifySession: Strategy.VerifyFunction<IAuthSession, OAuth2.VerifyOptions> = async ({
  tokens,
}) => {
  try {
    if (!tokens.idToken()) {
      throw new AuthenticationError('No id_token in response');
    }

    if (!tokens.accessToken()) {
      throw new AuthenticationError('No access_token in response');
    }

    return {
      idToken: tokens.idToken(),
      accessToken: tokens.accessToken(),
      refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : null,
      expiredAt: tokens.accessTokenExpiresAt(),
    };
  } catch (error) {
    throw new AuthenticationError(
      error instanceof Error ? error.message : 'Failed to fetch user profile'
    );
  }
};

let discovery: Promise<OAuth2<IAuthSession>> | null = null;

/**
 * https://github.com/sergiodxa/remix-auth-oauth2?tab=readme-ov-file#discovering-the-provider
 * Discovery fetches `${issuer}/.well-known/openid-configuration` to resolve the
 * authorization/token/revocation endpoints. It runs lazily on the first strategy call —
 * NOT at module import — so importing auth modules stays side-effect free (unit tests
 * load AuthService without a reachable IdP). A failed discovery is not cached, so the
 * next call retries instead of pinning the error.
 */
function discoverZitadelStrategy(): Promise<OAuth2<IAuthSession>> {
  discovery ??= OAuth2.discover<IAuthSession>(
    zitadelIssuer,
    {
      clientId: env.server.authOidcClientId ?? '',
      clientSecret: '',
      redirectURI: `${env.public.appUrl ?? 'http://localhost:3000'}${paths.auth.callback}`,
      scopes: ['openid', 'profile', 'email', 'phone', 'address', 'offline_access'],
      // codeChallengeMethod: CodeChallengeMethod.S256,
    },
    verifySession
  ).catch((error: unknown) => {
    discovery = null;
    // A down/unreachable IdP is a login failure, not a server bug: surface a
    // 401 so the user sees an auth failure instead of a 500, and keep the
    // failure out of Sentry (AuthenticationError captures nothing).
    throw new AuthenticationError(
      error instanceof Error ? error.message : 'Failed to discover OIDC strategy'
    );
  });
  return discovery;
}

type ZitadelTokens = Awaited<ReturnType<OAuth2<IAuthSession>['refreshToken']>>;

class LazyZitadelStrategy extends Strategy<IAuthSession, OAuth2.VerifyOptions> {
  name = 'zitadel';

  async authenticate(request: Request): Promise<IAuthSession> {
    const strategy = await discoverZitadelStrategy();
    return strategy.authenticate(request);
  }

  async refreshToken(refreshToken: string): Promise<ZitadelTokens> {
    const strategy = await discoverZitadelStrategy();
    return strategy.refreshToken(refreshToken);
  }

  async revokeToken(token: string): Promise<void> {
    const strategy = await discoverZitadelStrategy();
    return strategy.revokeToken(token);
  }
}

export const zitadelStrategy = new LazyZitadelStrategy(verifySession);
