import { AuthService, destroyAllAuthCookies, destroyLocalSessions } from '@/utils/auth';
import { getIdTokenSession } from '@/utils/cookies';
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';

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
      return redirect(endSessionUrl, { headers: await destroyAllAuthCookies(request) });
    }

    // No idToken → can't do RP-initiated logout; just clear local cookies + go to login.
    return destroyLocalSessions(request);
  } catch (error) {
    console.error('[Auth] Error during sign out process:', error);
    return destroyLocalSessions(request);
  }
};

export async function action({ request }: ActionFunctionArgs) {
  return signOut(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return signOut(request);
}
