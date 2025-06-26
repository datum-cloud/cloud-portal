import { routes } from '@/constants/routes';
import { zitadelIssuer, zitadelStrategy } from '@/modules/auth/strategies/zitadel.server';
import { getIdTokenSession } from '@/modules/cookie/id-token.server';
import { getSession } from '@/modules/cookie/session.server';
import { destroyLocalSessions } from '@/utils/session';
import type { ActionFunctionArgs } from 'react-router';
import { LoaderFunctionArgs, redirect } from 'react-router';

const signOut = async (request: Request) => {
  try {
    // 1. Revoke tokens
    const { session } = await getSession(request);
    if (session?.accessToken) {
      await zitadelStrategy.revokeToken(session.accessToken);
    }

    // 2. Redirect to OIDC provider's end_session_endpoint
    const { idToken } = await getIdTokenSession(request);
    if (idToken) {
      const endSessionUrl = new URL(`${zitadelIssuer}/oidc/v1/end_session`);
      endSessionUrl.searchParams.append('id_token_hint', idToken);
      endSessionUrl.searchParams.append(
        'post_logout_redirect_uri',
        `${process.env.APP_URL}${routes.auth.logOutCallback}`
      );
      endSessionUrl.searchParams.append('client_id', process.env.AUTH_OIDC_CLIENT_ID ?? ''); // Some providers might require client_id

      return redirect(endSessionUrl.toString());
    }

    return destroyLocalSessions(request);
  } catch (error) {
    console.error('Error during sign out process:', error);

    return destroyLocalSessions(request);
  }
};

export async function action({ request }: ActionFunctionArgs) {
  return signOut(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  return signOut(request);
}
