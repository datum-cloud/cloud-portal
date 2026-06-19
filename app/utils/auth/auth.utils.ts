/**
 * Authentication utility functions
 */
import { paths } from '@/utils/config/paths.config';
import {
  destroyAlertState,
  destroyIdTokenSession,
  destroyOrgSession,
  destroyProjectSession,
  destroyRefreshToken,
  destroySession,
} from '@/utils/cookies';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { redirect } from 'react-router';

/**
 * Builds the combined Set-Cookie headers that clear every local auth cookie,
 * WITHOUT issuing a redirect. Shared by destroyLocalSessions (→ login) and the
 * front-channel logout (→ Zitadel end_session).
 */
export const destroyAllAuthCookies = async (request: Request): Promise<Headers> => {
  const { headers: sessionHeaders } = await destroySession(request);
  const { headers: refreshHeaders } = await destroyRefreshToken(request);
  const { headers: orgHeaders } = await destroyOrgSession(request);
  const { headers: projectHeaders } = await destroyProjectSession(request);
  const { headers: idTokenHeaders } = await destroyIdTokenSession(request);
  const { headers: alertHeaders } = await destroyAlertState(request);
  return combineHeaders(
    sessionHeaders,
    refreshHeaders,
    orgHeaders,
    projectHeaders,
    idTokenHeaders,
    alertHeaders
  );
};

/**
 * Destroys all local sessions and redirects to login page
 *
 * Used during logout to clear all authentication-related cookies:
 * - Session cookie (access token)
 * - Refresh token cookie
 * - Organization session
 * - Project session
 * - ID token session
 * - Alert state
 */
export const destroyLocalSessions = async (request: Request) => {
  return redirect(paths.auth.logIn, { headers: await destroyAllAuthCookies(request) });
};
