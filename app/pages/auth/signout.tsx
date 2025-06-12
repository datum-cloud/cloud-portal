import { routes } from '@/constants/routes';
import { authenticator } from '@/modules/auth/auth.server';
import { organizationCookie, sessionCookie, tokenCookie } from '@/utils/cookies';
import { combineHeaders } from '@/utils/helpers';
import { redirect } from 'react-router';
import { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.logout('zitadel', request);

  const { headers: sessionHeaders } = await sessionCookie.destroy(request);
  const { headers: organizationHeaders } = await organizationCookie.destroy(request);
  const { headers: idTokenHeaders } = await tokenCookie.destroy(request);

  return redirect(routes.auth.logIn, {
    headers: combineHeaders(sessionHeaders, organizationHeaders, idTokenHeaders),
  });
}

export default function Logout() {
  return <div>Loading...</div>;
}
