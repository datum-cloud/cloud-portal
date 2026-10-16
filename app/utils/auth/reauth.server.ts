import { AuthService } from './auth.service';
import { destroyAllAuthCookies } from './auth.utils';
import { authenticator } from '@/modules/auth/auth.server';
import { logger } from '@/modules/logger';
import { paths } from '@/utils/config/paths.config';
import {
  clearReauthAttempt,
  hasRecentReauthAttempt,
  markReauthAttempt,
} from '@/utils/cookies/reauth-attempt.server';
import {
  clearRedirectIntent,
  isValidRedirectTarget,
  setRedirectIntent,
} from '@/utils/cookies/redirect-intent.server';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { redirect } from 'react-router';

/**
 * Restarts the OIDC login after a session or token expired.
 *
 * Clears the LOCAL auth cookies only. There is no end_session call, so when
 * Zitadel still has a session the login completes without a prompt. The page
 * in `returnTo` is saved as the redirect intent together with the user id of
 * the stale session, so the callback can restore it for the same user only.
 *
 * `returnTo` must be a relative same-origin path; anything else (absolute
 * URLs, auth routes) is refused and any earlier intent is cleared.
 *
 * Loop guard: a second re-auth within a minute means the previous silent login
 * produced a token the API rejected again. Instead of another silent login,
 * this sends the user to the full logout, which ends the Zitadel session so the
 * next login needs the user.
 *
 * @param request Incoming request; may carry a stale `_session` cookie
 * @param returnTo Relative path to restore after login
 */
export async function startReauth(request: Request, returnTo: string): Promise<Response> {
  const { session } = await AuthService.getSession(request.headers.get('Cookie'));

  // Leave the auth cookies in place: logout reads the id token for end_session.
  if (await hasRecentReauthAttempt(request)) {
    logger.warn('[Auth] Re-auth loop detected; signing out', { sub: session?.sub });
    return redirect(paths.auth.logOut, {
      headers: { 'Set-Cookie': await clearReauthAttempt() },
    });
  }

  const authCookieHeaders = await destroyAllAuthCookies(request);

  const intent = isValidRedirectTarget(returnTo, [])
    ? await setRedirectIntent(request, returnTo, session?.sub)
    : await clearRedirectIntent(request);
  const headers = combineHeaders(authCookieHeaders, intent.headers, {
    'Set-Cookie': await markReauthAttempt(),
  });

  // The OIDC state is bound to this URL, so start from one without the query.
  const url = new URL(request.url);
  url.search = '';

  try {
    await authenticator.authenticate('zitadel', new Request(url.toString(), request));
  } catch (error) {
    if (error instanceof Response) {
      headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') error.headers.append('Set-Cookie', value);
      });
      return error;
    }
    throw error;
  }

  // authenticate() always throws the provider redirect when no code is
  // present; landing here means it did not, so fall back to the login page.
  return redirect(paths.auth.logIn, { headers });
}
