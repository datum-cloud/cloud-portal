import { zitadelStrategy } from './strategies/zitadel.server';
import { routes } from '@/constants/routes';
import { organizationCookie } from '@/utils/cookies';
import { sessionCookie } from '@/utils/cookies/session';
import { tokenCookie } from '@/utils/cookies/token';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers';
import { isPast } from 'date-fns';
import { redirect } from 'react-router';
import { Authenticator } from 'remix-auth';

export interface ISession {
  sub: string;
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
  expiredAt: Date;
}

// Extend the Authenticator class
class CustomAuthenticator extends Authenticator<ISession> {
  async logout(strategy: string, request: Request) {
    const provider = this.get(strategy);
    if (!provider) {
      throw new AuthenticationError(`Strategy ${strategy} not found`).toResponse();
    }

    if (typeof (provider as any).logout === 'function') {
      return await (provider as any).logout(request);
    }

    throw new AuthenticationError(`Strategy ${strategy} does not support logout`).toResponse();
  }

  async refresh(strategy: string, request: Request): Promise<ISession> {
    const provider = this.get(strategy);
    if (!provider) {
      throw new AuthenticationError(`Strategy ${strategy} not found`).toResponse();
    }

    if (typeof (provider as any).refresh === 'function') {
      return await (provider as any).refresh(request);
    }

    throw new AuthenticationError(
      `Strategy ${strategy} does not support refresh token`
    ).toResponse();
  }

  async isAuthenticated(request: Request): Promise<Response | boolean> {
    const session = await sessionCookie.get(request);

    // Check if session is expired
    if (session?.data?.expiredAt && isPast(session.data.expiredAt)) {
      // Todo: refresh token

      // Redirect to logout page
      throw new AuthenticationError('Session expired').toResponse();
    }

    return !!session?.data;
  }

  async getSession(
    request: Request
  ): Promise<(ISession & { headers: Headers; organization: string | null }) | null> {
    const session = await sessionCookie.get(request);
    const idToken = await tokenCookie.get(request);
    const organization = await organizationCookie.get(request);

    return {
      sub: session.data?.sub ?? '',
      idToken: idToken.data?.idToken ?? '',
      accessToken: session.data?.accessToken ?? '',
      refreshToken: session.data?.refreshToken ?? null,
      expiredAt: session.data?.expiredAt ?? new Date(),
      organization: organization.data?.id ?? null,
      headers: combineHeaders(session.headers, idToken.headers, organization.headers),
    };
  }
}

// Use the extended class instead of the base Authenticator
export const authenticator = new CustomAuthenticator();

// provide support for multiple strategies
authenticator.use(zitadelStrategy, 'zitadel');
