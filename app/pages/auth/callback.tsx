import { routes } from '@/constants/routes';
import { authenticator } from '@/modules/auth/auth.server';
import { createAPIFactory } from '@/resources/api/api-factory.server';
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { organizationCookie, sessionCookie, tokenCookie } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers';
import { AxiosInstance } from 'axios';
import { redirect, LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const credentials = await authenticator.authenticate('zitadel', request);
  if (!credentials) {
    throw new AuthenticationError('Authentication failed');
  }

  const session = await sessionCookie.set(request, {
    sub: credentials.sub,
    accessToken: credentials.accessToken,
    refreshToken: credentials.refreshToken,
    expiredAt: credentials.expiredAt,
  });
  const token = await tokenCookie.set(request, {
    idToken: credentials.idToken,
  });

  // Get Organization List for set it as default
  const apiClient = createAPIFactory(credentials.accessToken);
  const orgApi = iamOrganizationsAPI(apiClient as AxiosInstance);
  const orgList = await orgApi.list();

  if (orgList.length > 0) {
    const org = await organizationCookie.set(request, { id: orgList[0].id ?? null });

    return redirect(routes.home, {
      headers: combineHeaders(session.headers, token.headers, org.headers),
    });
  }

  return redirect(routes.account.organizations.root, {
    headers: combineHeaders(session.headers, token.headers),
  });
}

export default function Callback() {
  return <div>Loading...</div>;
}
