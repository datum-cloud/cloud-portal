import { destroyLocalSessions } from '@/features/auth/utils';
import { AuthService } from '@/utils/auth';
import { getIdTokenSession } from '@/utils/cookies';
import type { ActionFunctionArgs, LoaderFunctionArgs, AppLoadContext } from 'react-router';

const signOut = async (request: Request, context: AppLoadContext) => {
  try {
    // Get ID token for OIDC end_session
    const { idToken } = await getIdTokenSession(request);
    const cookieHeader = request.headers.get('Cookie');

    // Revoke tokens at Zitadel and end OIDC session
    await AuthService.logout(cookieHeader, idToken);

    // Destroy all local sessions and redirect to login
    return destroyLocalSessions(request, context);
  } catch (error) {
    console.error('[Auth] Error during sign out process:', error);

    // Fallback: destroy sessions anyway
    return destroyLocalSessions(request, context);
  }
};

export async function action({ request, context }: ActionFunctionArgs) {
  return signOut(request, context);
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  return signOut(request, context);
}
