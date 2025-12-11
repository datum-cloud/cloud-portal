import { AuthService, destroyLocalSessions } from '@/utils/auth';
import { getIdTokenSession } from '@/utils/cookies';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

const signOut = async (request: Request) => {
  try {
    // Get ID token for OIDC end_session
    const { idToken } = await getIdTokenSession(request);
    const cookieHeader = request.headers.get('Cookie');

    // Revoke tokens at Zitadel and end OIDC session
    await AuthService.logout(cookieHeader, idToken);

    // Destroy all local sessions and redirect to login
    return destroyLocalSessions(request);
  } catch (error) {
    console.error('[Auth] Error during sign out process:', error);

    // Fallback: destroy sessions anyway
    return destroyLocalSessions(request);
  }
};

export async function action({ request }: ActionFunctionArgs) {
  return signOut(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return signOut(request);
}
