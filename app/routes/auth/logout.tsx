import { AuthService, destroyAllAuthCookies, destroyLocalSessions } from '@/utils/auth';
import { clearRedirectIntent, getIdTokenSession } from '@/utils/cookies';
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';

/** Appends the Set-Cookie that drops the saved redirect intent. */
async function withIntentCleared(request: Request, response: Response): Promise<Response> {
  const { headers } = await clearRedirectIntent(request);
  const cookie = headers.get('Set-Cookie');
  if (cookie) response.headers.append('Set-Cookie', cookie);
  return response;
}

/**
 * Manual Sign out. Never restores a page: the saved redirect intent is
 * cleared on every path, so the next login lands on the default page.
 */
const signOut = async (request: Request) => {
  try {
    const { idToken } = await getIdTokenSession(request);
    const cookieHeader = request.headers.get('Cookie');

    // Revoke tokens; get the front-channel end_session URL (null if no idToken).
    const { endSessionUrl } = await AuthService.logout(cookieHeader, idToken);

    if (endSessionUrl) {
      // Destroy local cookies AND navigate the browser to Zitadel end_session so it can
      // clear __Host-zitadel.useragent and end the SSO session (which then bounces to
      // /id/logout?logout_token=... where auth-ui completes the logout).
      const response = redirect(endSessionUrl, { headers: await destroyAllAuthCookies(request) });
      return withIntentCleared(request, response);
    }

    // No idToken → can't do RP-initiated logout; just clear local cookies + go to login.
    return withIntentCleared(request, await destroyLocalSessions(request));
  } catch (error) {
    console.error('[Auth] Error during sign out process:', error);
    return withIntentCleared(request, await destroyLocalSessions(request));
  }
};

export async function action({ request }: ActionFunctionArgs) {
  return signOut(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return signOut(request);
}
