import { organizationCookie } from './cookies/organization';
import { sessionCookie } from './cookies/session';
import { tokenCookie } from './cookies/token';
import { routes } from '@/constants/routes';
import { combineHeaders } from '@/utils/helpers/misc.helper';
import { redirect } from 'react-router';

export const destroyLocalSessions = async (request: Request) => {
  const { headers: sessionHeaders } = await sessionCookie.destroy(request);
  const { headers: orgHeaders } = await organizationCookie.destroy(request);
  const { headers: idTokenHeaders } = await tokenCookie.destroy(request);

  return redirect(routes.auth.logIn, {
    headers: combineHeaders(sessionHeaders, orgHeaders, idTokenHeaders),
  });
};
