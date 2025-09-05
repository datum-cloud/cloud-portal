import { destroyLocalSessions } from '@/features/auth/utils';
import { zitadelIssuer, zitadelStrategy } from '@/modules/auth/strategies/zitadel.server';
import { getIdTokenSession } from '@/modules/cookie/id-token.server';
import { getSession } from '@/modules/cookie/session.server';
import { BadRequestError } from '@/utils/errors';
import type { ActionFunctionArgs } from 'react-router';
import { LoaderFunctionArgs, AppLoadContext } from 'react-router';

const signOut = async (request: Request, context: AppLoadContext) => {
  try {
    // 1. Revoke tokens
    const { session } = await getSession(request);
    if (session?.accessToken) {
      await zitadelStrategy.revokeToken(session.accessToken);
    }

    // 2. Redirect to OIDC provider's end_session_endpoint
    const { idToken } = await getIdTokenSession(request);

    if (!idToken) {
      throw new BadRequestError('No id_token in request');
    }

    const body = new URLSearchParams();
    body.append('id_token_hint', idToken);

    await fetch(`${zitadelIssuer}/oidc/v1/end_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    return destroyLocalSessions(request, context);
  } catch (error) {
    console.error('Error during sign out process:', error);

    return destroyLocalSessions(request, context);
  }
};

export async function action({ request, context }: ActionFunctionArgs) {
  return signOut(request, context);
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  return signOut(request, context);
}
