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
 * Destroys all local sessions and redirects to login page
 *
 * Used during logout to clear all authentication-related cookies:
 * - Session cookie (access token)
 * - Refresh token cookie
 * - Organization session
 * - ID token session
 * - Alert state
 */
export const destroyLocalSessions = async (request: Request) => {
  const { headers: sessionHeaders } = await destroySession(request);
  const { headers: refreshHeaders } = await destroyRefreshToken(request);
  const { headers: orgHeaders } = await destroyOrgSession(request);
  const { headers: projectHeaders } = await destroyProjectSession(request);
  const { headers: idTokenHeaders } = await destroyIdTokenSession(request);
  const { headers: alertHeaders } = await destroyAlertState(request);

  return redirect(paths.auth.logIn, {
    headers: combineHeaders(
      sessionHeaders,
      refreshHeaders,
      orgHeaders,
      projectHeaders,
      idTokenHeaders,
      alertHeaders
    ),
  });
};
